import React from 'react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/cn';

export interface FileDropCardProps {
  title: string;
  description: string;
  accept?: string[];
  onUpload: (file: File) => void;
  cta?: string;
}

export const FileDropCard: React.FC<FileDropCardProps> = ({ title, description, accept, onUpload, cta = 'Upload asset' }) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: accept?.reduce((acc, type) => ({ ...acc, [type]: [] as string[] }), {} as Record<string, string[]>),
    maxSize: 50 * 1024 * 1024,
    onDropAccepted: (files) => {
      if (files[0]) {
        onUpload(files[0]);
      }
    }
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'group relative flex cursor-pointer flex-col gap-3 rounded-3xl border border-dashed border-white/15 bg-white/5 p-6 text-white transition hover:border-primary-400 hover:bg-primary-500/5',
        isDragActive ? 'border-primary-500 bg-primary-500/10 shadow-glow' : ''
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col gap-2">
        <h4 className="text-lg font-semibold">{title}</h4>
        <p className="text-sm text-white/60">{description}</p>
        <span className="text-xs uppercase tracking-[0.3em] text-primary-300">{cta}</span>
      </div>
    </div>
  );
};

export default FileDropCard;
