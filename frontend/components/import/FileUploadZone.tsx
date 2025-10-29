'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadIcon, XIcon, FileArchiveIcon } from 'lucide-react';

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClearFile: () => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes

export function FileUploadZone({
  onFileSelect,
  selectedFile,
  onClearFile,
  disabled = false,
}: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!file.name.endsWith('.zip')) {
      return 'Seul les fichiers .zip sont acceptés';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `Le fichier est trop volumineux. Maximum: ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
    }
    return null;
  };

  const handleFile = (file: File) => {
    setError(null);
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    onFileSelect(file);
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-4">
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
            : 'border-zinc-300 dark:border-zinc-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!disabled && !selectedFile ? handleBrowseClick : undefined}
      >
        <CardContent className="flex flex-col items-center justify-center py-12 px-6">
          {!selectedFile ? (
            <>
              <UploadIcon className="h-12 w-12 text-zinc-400 mb-4" />
              <p className="text-lg font-medium text-zinc-900 dark:text-zinc-50 mb-2">
                Glissez votre fichier ici
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                ou cliquez pour parcourir vos fichiers
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Fichiers .zip uniquement (max 50MB)
              </p>
            </>
          ) : (
            <div className="flex items-center gap-4 w-full">
              <FileArchiveIcon className="h-10 w-10 text-blue-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearFile();
                    setError(null);
                  }}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-950 p-3">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".zip"
        onChange={handleFileInput}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
}
