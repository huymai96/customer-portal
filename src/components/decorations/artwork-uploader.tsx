'use client';

/**
 * Artwork Uploader Component
 * 
 * Handles artwork file uploads with:
 * - Drag-and-drop support
 * - File type validation (images, PDFs, AI files)
 * - Size limit enforcement
 * - Preview generation
 * - Multiple file support
 */

import { useState, useRef } from 'react';
import { ArrowUpTrayIcon, XMarkIcon, DocumentIcon } from '@heroicons/react/24/outline';

const ALLOWED_FILE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/svg+xml',
  'application/pdf',
  'application/postscript', // .ai, .eps
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export interface ArtworkFile {
  id: string;
  file: File;
  preview?: string;
  uploadUrl?: string;
}

interface ArtworkUploaderProps {
  files: ArtworkFile[];
  onFilesChange: (files: ArtworkFile[]) => void;
  maxFiles?: number;
}

export function ArtworkUploader({ files, onFilesChange, maxFiles = 10 }: ArtworkUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return `${file.name}: Invalid file type. Please upload PNG, JPEG, GIF, SVG, PDF, or AI files.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name}: File size exceeds 50MB limit.`;
    }
    return null;
  };

  const generatePreview = (file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(undefined);
        reader.readAsDataURL(file);
      } else {
        resolve(undefined);
      }
    });
  };

  const handleFiles = async (newFiles: FileList | File[]) => {
    setError(null);

    const fileArray = Array.from(newFiles);
    
    if (files.length + fileArray.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const validatedFiles: ArtworkFile[] = [];
    
    for (const file of fileArray) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      const preview = await generatePreview(file);
      validatedFiles.push({
        id: `${Date.now()}-${Math.random()}`,
        file,
        preview,
      });
    }

    onFilesChange([...files, ...validatedFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleRemoveFile = (id: string) => {
    onFilesChange(files.filter((f) => f.id !== id));
    setError(null);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={triggerFileInput}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 bg-white'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_FILE_TYPES.join(',')}
          onChange={handleFileInput}
          className="hidden"
        />
        <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm font-medium text-gray-900">
          Drop artwork files here or click to browse
        </p>
        <p className="mt-1 text-xs text-gray-500">
          PNG, JPEG, GIF, SVG, PDF, or AI files up to 50MB
        </p>
        <p className="mt-1 text-xs text-gray-500">
          {files.length} / {maxFiles} files uploaded
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {files.map((artworkFile) => (
            <div
              key={artworkFile.id}
              className="relative group rounded-lg border border-gray-200 p-3 hover:border-gray-300"
            >
              {/* Preview or Icon */}
              <div className="aspect-square mb-2 rounded bg-gray-100 flex items-center justify-center overflow-hidden">
                {artworkFile.preview ? (
                  <img
                    src={artworkFile.preview}
                    alt={artworkFile.file.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <DocumentIcon className="h-16 w-16 text-gray-400" />
                )}
              </div>

              {/* File Info */}
              <div className="text-sm">
                <p className="font-medium text-gray-900 truncate" title={artworkFile.file.name}>
                  {artworkFile.file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(artworkFile.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>

              {/* Remove Button */}
              <button
                type="button"
                onClick={() => handleRemoveFile(artworkFile.id)}
                className="absolute top-2 right-2 p-1 rounded-full bg-white shadow-sm border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:border-red-200"
              >
                <XMarkIcon className="h-4 w-4 text-gray-600 hover:text-red-600" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

