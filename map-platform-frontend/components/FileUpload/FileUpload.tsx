import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface FileUploadProps {
  onUpload: (file: File, url: string) => void;
  accept?: string;
  maxSize?: number;
  className?: string;
}

export default function FileUpload({ 
  onUpload, 
  accept = '.glb,.gltf,.obj,.fbx,.dae',
  maxSize = 50 * 1024 * 1024, // 50MB
  className = ''
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    setUploading(true);
    setError(null);

    try {
      // Create a temporary URL for the file
      const url = URL.createObjectURL(file);
      onUpload(file, url);
    } catch (err) {
      setError('Failed to upload file. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'model/gltf-binary': ['.glb'],
      'model/gltf+json': ['.gltf'],
      'model/obj': ['.obj'],
      'model/fbx': ['.fbx'],
      'model/collada': ['.dae']
    },
    maxSize,
    multiple: false
  });

  return (
    <div className={`w-full ${className}`}>
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-blue-400 bg-blue-50' 
            : isDragReject 
              ? 'border-red-400 bg-red-50' 
              : 'border-gray-300 hover:border-gray-400'
          }
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        {uploading ? (
          <div className="space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-600">Uploading...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-4xl mb-2">📁</div>
            {isDragActive ? (
              <p className="text-blue-600 font-medium">Drop the 3D model here...</p>
            ) : (
              <>
                <p className="text-gray-700 font-medium">
                  Drag & drop a 3D model here, or click to select
                </p>
                <p className="text-sm text-gray-500">
                  Supported formats: GLB, GLTF, OBJ, FBX, DAE (max {Math.round(maxSize / 1024 / 1024)}MB)
                </p>
              </>
            )}
          </div>
        )}
      </div>
      
      {error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}
    </div>
  );
} 