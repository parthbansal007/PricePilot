import { LocalStorageProvider } from '../providers/LocalStorageProvider.js';
import { S3StorageProvider } from '../providers/S3StorageProvider.js';

class StorageService {
  constructor() {
    const provider = process.env.STORAGE_PROVIDER || 'local';
    
    if (provider === 's3') {
      console.log('Using S3StorageProvider');
      this.provider = new S3StorageProvider();
    } else {
      console.log('Using LocalStorageProvider');
      this.provider = new LocalStorageProvider();
    }
  }

  async uploadFile(file) {
    return await this.provider.upload(file);
  }
}

export const storageService = new StorageService();
