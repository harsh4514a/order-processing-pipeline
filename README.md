# Order Processing Pipeline

A production-ready file upload and processing pipeline built with **Node.js**, **Express.js**, **PostgreSQL**, and **Google Cloud Storage (GCS)**.

The application accepts CSV/XLSX files containing order records, stores the original file in Google Cloud Storage, streams and validates the data, distributes records across multiple PostgreSQL shards, and returns a detailed processing summary.

---

# Features

- Upload CSV and XLSX files
- Store original uploaded files in Google Cloud Storage (GCS)
- Google Cloud Application Default Credentials (ADC) authentication
- Stream-based CSV and XLSX processing
- Memory-efficient processing for large files
- Configurable batch database insertion (default: 500 records)
- Application-level PostgreSQL sharding
- Duplicate file detection using SHA-256 fingerprint
- Row-level validation
- Partial success processing (invalid rows are skipped)
- Retry mechanism for GCS upload and database operations
- Structured logging using Winston
- Upload metrics and processing summary

---

# Architecture

```text
                    Client
                       │
                       ▼
               Upload Orders API
                       │
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
Google Cloud Storage          Stream Parser
(Store Original File)                │
                                     ▼
                            Row Validation
                                     │
                                     ▼
                            Batch Builder
                            (Default: 500)
                                     │
                                     ▼
                               Shard Router
                                     │
                       ┌─────────────┬─────────────┬
                       ▼             ▼             ▼
                    Shard 1       Shard 2       Shard 3
                   PostgreSQL    PostgreSQL    PostgreSQL
```

---

# Why Google Cloud Storage?

The original uploaded file is stored in Google Cloud Storage before processing to provide:

- Backup of the original uploaded file
- Auditability
- Recovery in case of failures
- Reprocessing capability
- Protection against accidental data loss

The database stores processed order records, while GCS preserves the original uploaded file.

---

# Database Sharding

The application uses **application-level sharding**.

Orders are routed using:

```text
hash(customer_id) % totalShards + 1
```

This guarantees:

- Same customer always goes to the same shard
- Even distribution across shards
- Better horizontal scalability

---

# Duplicate File Detection

Each uploaded file is fingerprinted using **SHA-256**.

If the same file is uploaded again, processing is rejected before parsing begins.

This prevents duplicate imports.

---

# Upload Registry

Every upload is recorded in the upload registry.

Stored metadata includes:

- Original filename
- Generated GCS filename
- Bucket name
- SHA-256 fingerprint
- Upload timestamp

This allows original files stored in GCS to be traced and retrieved later.

---

# Google Cloud Storage Setup

## 1. Install Google Cloud SDK

Install Google Cloud SDK:

https://cloud.google.com/sdk/docs/install

Initialize:

```bash
gcloud init
```

---

## 2. Create a Bucket

```bash
gcloud storage buckets create gs://YOUR_BUCKET_NAME --location=us-central1
```

---

## 3. Authenticate Using ADC

```bash
gcloud auth application-default login
```

Application Default Credentials are used automatically by the Google Cloud Storage SDK.

No service account JSON file is required.

---

# How ADC Works

Credential resolution order:

1. Workload Identity / Metadata Server (Cloud Runtime)
2. Local ADC credentials (`gcloud auth application-default login`)

The application never stores credentials in source code.

---

# Required IAM Permissions

Required permissions:

- storage.buckets.get
- storage.objects.create
- storage.objects.get
- storage.objects.delete

Recommended role:

```
roles/storage.objectAdmin
```

---

# Environment Variables

Copy:

```bash
cp env.example .env
```

Example:

```env
PORT=3000

GCS_BUCKET_NAME=your-gcs-bucket-name
GCS_UPLOAD_FOLDER=orders
GCS_REQUEST_TIMEOUT_MS=30000
GCS_ENFORCE_ADC=true

DATABASE_URL_SHARD1=postgresql://postgres:postgres@localhost:5432/orders_shard1
DATABASE_URL_SHARD2=postgresql://postgres:postgres@localhost:5432/orders_shard2
DATABASE_URL_SHARD3=postgresql://postgres:postgres@localhost:5432/orders_shard3

UPLOAD_MAX_FILE_SIZE_MB=50

BATCH_INSERT_SIZE=500
```

> Refer to `env.example` for the complete list.

---

# Upload API

## Endpoint

```
POST /api/v1/upload-orders
```

---

## Request

Content-Type:

```
multipart/form-data
```

Required field:

```
file
```

Supported formats:

- CSV
- XLSX

Maximum file size:

```
50 MB
```

---

## Sample Request

```bash
curl -X POST http://localhost:3000/api/v1/upload-orders \
-H "Content-Type: multipart/form-data" \
-F "file=@orders.csv"
```

---

## Sample Response

```json
{
  "success": true,
  "fileName": "orders-20260701120000-86c9d4ce-9f9a-4d2a-998f-ec6af01d9f97.csv",
  "bucket": "your-gcs-bucket-name",
  "totalRows": 10000,
  "processedRows": 10000,
  "insertedRows": 9988,
  "failedRows": 12,
  "processingTime": "1450ms",
  "uploadTime": "212ms",
  "databaseTime": "520ms",
  "batchSize": 500,
  "failedRowDetails": []
}
```

---

# Upload Workflow

```mermaid
flowchart TD

A[Client Upload]

A --> B[Validate Request]

B --> C[Upload Original File to Google Cloud Storage]

C --> D[Verify Upload]

D --> E[Stream CSV/XLSX]

E --> F[Validate Row]

F --> G[Build Batch]

G --> H[Route to Shard]

H --> I[Insert into PostgreSQL]

I --> J[Return Processing Summary]
```

---

# Validation Rules

Each record must satisfy:

| Field | Validation |
|--------|------------|
| order_id | Required, unique within uploaded file |
| customer_id | Required |
| order_date | Valid date |
| order_amount | Positive decimal |
| status | Pending, Completed, Cancelled, Processing, Rejected |

Invalid rows are skipped and returned in `failedRowDetails`.

Processing continues for valid rows.

---

# Streaming & Memory Efficiency

The application processes uploads using streaming.

Features:

- CSV parsed using `csv-parser`
- XLSX parsed using ExcelJS streaming reader
- Files are never fully loaded into memory
- Batches are flushed immediately after reaching configured batch size

---

# Batch Processing

Default batch size:

```
500 rows
```

Batch size is configurable through environment variables.

Benefits:

- Reduced memory usage
- Faster database insertion
- Better scalability

---

# Retry Strategy

Automatic retries are performed for transient failures.

Includes:

- Google Cloud Storage uploads
- Database batch inserts

---

# Logging

Application logs are written using Winston.

Generated log files:

```
logs/

├── combined.log
├── upload.log
├── database.log
└── error.log
```

---

# Security Controls

- Filename sanitization
- Object path normalization
- Duplicate upload detection
- No credential exposure
- No sensitive information returned in API responses

---

# Health Checking

Storage health check verifies:

- ADC authentication
- Bucket accessibility
- Upload permissions
- Object existence verification

Example response:

```json
{
  "healthy": true,
  "reason": "Bucket accessible"
}
```

---

# Performance

Successfully tested with:

- 10,000 record CSV upload
- Streaming parser
- Configurable batch insertion
- Google Cloud Storage integration
- PostgreSQL application-level sharding

---

# Testing

Run tests:

```bash
npm test
```

Storage tests cover:

- Successful upload
- Authentication failure
- Permission failure
- Bucket not found
- Invalid file type
- Upload timeout
- Unique filename generation

---

# Troubleshooting

## Authentication Failure (401)

```bash
gcloud auth application-default login
```

Verify the active Google account.

---

## Permission Denied (403)

Verify:

- IAM permissions
- Bucket access
- Project access

---

## Bucket Not Found (404)

Verify:

- Bucket exists
- Correct bucket name
- Correct Google Cloud project

---

## Network Timeout

- Verify internet connectivity
- Retry the request

---

# License

This project is intended for educational and assessment purposes.# order-processing-pipeline
# order-processing-pipeline
