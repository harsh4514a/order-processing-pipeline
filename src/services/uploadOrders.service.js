const fs = require('fs/promises');
const logger = require('../logger/logger');
const config = require('../config/env');
const AppError = require('../utils/appError');
const storageService = require('./storage.service');
const ordersRepository = require('../repositories/orders.repository');
const { createBatchBuilder } = require('../utils/batchBuilder');
const { validateOrderRow } = require('../utils/orderRowValidator');
const { resolveParser } = require('../utils/fileParserFactory');
const { sanitizeFileName } = require('../utils/fileNameSanitizer');
const { withRetry } = require('../utils/retry');
const { recordUploadSummary } = require('../utils/metricsRegistry');
const { computeFileSha256 } = require('../utils/fileFingerprint');
const uploadRegistryRepository = require('../repositories/uploadRegistry.repository');

class UploadOrdersService {
  async processUpload(file) {
    const processingStartedAt = Date.now();
    const seenOrderIds = new Set();
    const invalidRows = [];
    let totalDatabaseTimeMs = 0;

    const fingerprint = await computeFileSha256(file.path);
    if (await uploadRegistryRepository.existsByFingerprint(fingerprint)) {
      const duplicateError = new AppError('Duplicate file upload detected and rejected', 409);
      duplicateError.code = 'DUPLICATE_FILE_UPLOAD';
      throw duplicateError;
    }

    const counters = {
      totalRows: 0,
      processedRows: 0,
      insertedRows: 0,
      failedRows: 0,
      currentBatch: 0
    };

    const parser = resolveParser(file.mimetype, file.originalname);
    if (!parser) {
      const error = new AppError('Unsupported file format for parsing', 400, {
        mimetype: file.mimetype,
        fileName: file.originalname
      });
      error.code = 'UNSUPPORTED_FILE_FORMAT';
      throw error;
    }

    logger.info(
      {
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      },
      'Upload request received'
    );

    const uploadStartedAt = Date.now();
    let uploadedFileMetadata;

    try {
      uploadedFileMetadata = await withRetry({
        retries: 3,
        baseDelayMs: 200,
        task: async () => storageService.uploadFile(file.path, {
          contentType: file.mimetype
        }),
        onRetry: async ({ attempt, delayMs, error }) => {
          logger.warn(
            {
              attempt,
              delayMs,
              code: error.code,
              reason: error.message
            },
            'Retrying GCS upload after transient failure'
          );
        }
      });
    } catch (error) {
      logger.error({ error }, 'Failed to upload original file to GCS');
      throw error;
    }

    const uploadedExists = await storageService.fileExists(uploadedFileMetadata.fileName);
    if (!uploadedExists) {
      const error = new AppError('GCS upload verification failed', 502, {
        fileName: uploadedFileMetadata.fileName,
        bucket: uploadedFileMetadata.bucket
      });
      error.code = 'UPLOAD_VERIFICATION_FAILED';
      throw error;
    }

    const uploadDurationMs = Date.now() - uploadStartedAt;

    logger.info(
      {
        bucket: uploadedFileMetadata.bucket,
        fileName: uploadedFileMetadata.fileName,
        uploadDurationMs
      },
      'Upload completed and verified'
    );

    logger.info({ filePath: file.path }, 'Streaming started');

    const batchBuilder = createBatchBuilder({
      batchSize: config.database.defaultBatchSize,
      onBatch: async (batchRows, batchNumber) => {
        const batchStartedAt = Date.now();
        counters.currentBatch = batchNumber;

        logger.info(
          {
            batchNumber,
            batchSize: batchRows.length
          },
          'Batch started'
        );

        const result = await withRetry({
          retries: 2,
          baseDelayMs: 120,
          task: async () => ordersRepository.createOrdersBatch(batchRows, {
            batchSize: config.database.defaultBatchSize
          }),
          onRetry: async ({ attempt, delayMs, error }) => {
            logger.warn(
              {
                batchNumber,
                attempt,
                delayMs,
                code: error.code,
                reason: error.message
              },
              'Retrying batch insert after transient failure'
            );
          }
        });

        counters.insertedRows += result.insertedCount;
        totalDatabaseTimeMs += Date.now() - batchStartedAt;

        logger.info(
          {
            batchNumber,
            inserted: result.insertedCount,
            durationMs: Date.now() - batchStartedAt
          },
          'Batch completed'
        );
      }
    });

    try {
      await parser({
        filePath: file.path,
        onRow: async (row, rowNumber) => {
          counters.totalRows += 1;

          const validation = validateOrderRow({
            row,
            rowNumber,
            seenOrderIds
          });

          if (!validation.valid) {
          counters.failedRows += 1;
            invalidRows.push({
              rowNumber,
              reason: validation.reason,
              data: row
            });

          // Requirement: Log failed rows for operational observability.
          // This logs a minimal subset to avoid leaking sensitive payloads or huge objects.
          const { logInvalidRow } = require('../utils/logInvalidRow');
          logInvalidRow({
            rowNumber,
            reason: validation.reason,
            row,
            seenOrderIdsCount: seenOrderIds.size,
            countersSnapshot: { failedRows: counters.failedRows, totalRows: counters.totalRows }
          });

          return;
          }

          await batchBuilder.push(validation.normalizedRow);
          counters.processedRows += 1;

          if (counters.totalRows % 1000 === 0) {
            logger.info(
              {
                totalRows: counters.totalRows,
                insertedRows: counters.insertedRows,
                failedRows: counters.failedRows,
                currentBatch: counters.currentBatch,
                memoryUsage: process.memoryUsage().rss
              },
              'Upload processing progress'
            );
          }
        }
      });

      await batchBuilder.finalize();

      await uploadRegistryRepository.createEntry({
        fileFingerprint: fingerprint,
        originalFileName: file.originalname,
        uploadedFileName: uploadedFileMetadata.fileName,
        bucketName: uploadedFileMetadata.bucket
      });
    // } catch (error) {
    //   logger.error({ error }, 'Streaming or processing failed');
    //   const appError = new AppError('File parsing or batch processing failed', 422, {
    //     reason: error.message
    //   });
    //   appError.code = 'FILE_PROCESSING_FAILED';
    //   throw appError;
    }catch (error) {
  console.error("REAL ERROR:", error);
  console.error("STACK:", error.stack);

  throw error;

    } finally {
      await fs.unlink(file.path).catch(() => null);
    }

    logger.info(
      {
        totalRows: counters.totalRows,
        insertedRows: counters.insertedRows,
        failedRows: counters.failedRows,
        memoryUsage: process.memoryUsage().rss
      },
      'Streaming completed'
    );

    const processingTimeMs = Date.now() - processingStartedAt;

    recordUploadSummary({
      processedRows: counters.totalRows,
      insertedRows: counters.insertedRows,
      failedRows: counters.failedRows,
      processingTimeMs,
      uploadTimeMs: uploadDurationMs
    });

    logger.info(
      {
        totalRows: counters.totalRows,
        processedRows: counters.processedRows,
        insertedRows: counters.insertedRows,
        failedRows: counters.failedRows,
        processingTimeMs,
        databaseTimeMs: totalDatabaseTimeMs,
        uploadDurationMs,
        bucket: uploadedFileMetadata.bucket,
        generatedFilename: uploadedFileMetadata.fileName,
        memoryUsage: process.memoryUsage().rss
      },
      'Processing completed'
    );

    return {
      success: true,
      fileName: sanitizeFileName(uploadedFileMetadata.fileName),
      bucket: uploadedFileMetadata.bucket,
      totalRows: counters.totalRows,
      processedRows: counters.processedRows + counters.failedRows,
      insertedRows: counters.insertedRows,
      failedRows: counters.failedRows,
      processingTime: `${processingTimeMs}ms`,
      uploadTime: `${uploadDurationMs}ms`,
      databaseTime: `${totalDatabaseTimeMs}ms`,
      batchSize: config.database.defaultBatchSize,
      failedRowDetails: invalidRows
    };
  }
}

module.exports = new UploadOrdersService();
module.exports.UploadOrdersService = UploadOrdersService;
