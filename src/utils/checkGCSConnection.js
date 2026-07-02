const { getStorageClient, getBucket } = require('../storage/storageClient');
const { mapGcsError } = require('./gcsErrorMapper');

const checkGCSConnection = async () => {
  try {
    const storage = await getStorageClient();
    const bucket = await getBucket();

    // Forces ADC token retrieval and permission evaluation.
    const [projects] = await storage.getBuckets({ maxResults: 1 });
    const [exists] = await bucket.exists();

    if (!exists) {
      return {
        healthy: false,
        reason: 'Configured bucket does not exist or is not accessible'
      };
    }

    const permissionResult = await bucket.iam.testPermissions(['storage.objects.create']);
    const permissions = Array.isArray(permissionResult[0]) ? permissionResult[0] : [];

    const hasUploadPermission = permissions.includes('storage.objects.create');

    return {
      healthy: hasUploadPermission,
      reason: hasUploadPermission
        ? 'ADC authentication and bucket permissions are valid'
        : 'Missing storage.objects.create permission on bucket',
      metadata: {
        bucket: bucket.name,
        sampledProjectCount: projects.length
      }
    };
  } catch (error) {
    const mappedError = mapGcsError(error, 'GCS health check failed');
    return {
      healthy: false,
      reason: mappedError.message,
      code: mappedError.code
    };
  }
};

module.exports = {
  checkGCSConnection
};
