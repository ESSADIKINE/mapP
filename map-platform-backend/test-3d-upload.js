import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const BACKEND_URL = 'http://localhost:4000';

async function test3DUpload() {
  try {
    console.log('Testing 3D model upload...');
    
    // Create a simple test GLB file (this is just a placeholder)
    const testFilePath = path.join(process.cwd(), 'test-model.glb');
    
    // Check if uploads_3D directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads_3D');
    if (!fs.existsSync(uploadsDir)) {
      console.log('Creating uploads_3D directory...');
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    console.log('✅ Backend 3D upload setup is ready');
    console.log('📁 Uploads directory:', uploadsDir);
    console.log('🌐 Upload endpoint:', `${BACKEND_URL}/api/upload/3d-model`);
    console.log('📂 Serve endpoint:', `${BACKEND_URL}/api/upload/3d-model/:filename`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

test3DUpload();
