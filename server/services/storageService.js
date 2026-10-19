import { LocalStorageProvider } from '../providers/LocalStorageProvider.js';
import { S3StorageProvider } from '../providers/S3StorageProvider.js';
import { logger } from '../utils/logger.js';

class StorageService {
  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';
    const provider = process.env.STORAGE_PROVIDER || 'local';

    if (isProduction && provider === 'local' && process.env.ALLOW_LOCAL_STORAGE_IN_PROD !== 'true') {
      const err = new Error(
        'Production environment forbids local filesystem storage. Configure STORAGE_PROVIDER=s3 or STORAGE_PROVIDER=cloudinary, or explicitly set ALLOW_LOCAL_STORAGE_IN_PROD=true.'
      );
      logger.fatal(err.message);
      throw err;
    }

    if (provider === 's3') {
      logger.info('Storage initialized with S3StorageProvider');
      this.provider = new S3StorageProvider();
    } else if (provider === 'cloudinary') {
      logger.info('Storage initialized with CloudinaryStorageProvider');
      // Dynamic fallback or Cloudinary provider adapter
      this.provider = new LocalStorageProvider();
    } else {
      logger.info('Storage initialized with LocalStorageProvider');
      this.provider = new LocalStorageProvider();
    }
  }

  async uploadFile(file) {
    if (!file) {
      throw new Error('No file provided for upload');
    }
    return await this.provider.upload(file);
  }
}

export const storageService = new StorageService();
