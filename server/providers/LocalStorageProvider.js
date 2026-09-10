import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '../../public/uploads');

// Ensure directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export class LocalStorageProvider {
  async upload(file) {
    const filename = `${Date.now()}-${file.originalname}`;
    const filePath = path.join(UPLOADS_DIR, filename);
    
    fs.writeFileSync(filePath, file.buffer);
    
    // Return a relative URL that the frontend can use if hosted on same domain
    // Or just a full path if we setup static serving
    return `/uploads/${filename}`;
  }
}
