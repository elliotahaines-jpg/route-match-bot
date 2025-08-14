import React, { useCallback, useState } from 'react';
import { Upload, File, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  uploadedFile?: File | null;
  onRemoveFile?: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  accept,
  title,
  description,
  icon,
  uploadedFile,
  onRemoveFile,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onFileSelect(files[0]);
      }
    },
    [onFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        onFileSelect(files[0]);
      }
    },
    [onFileSelect]
  );

  if (uploadedFile) {
    return (
      <Card className="p-6 border-success bg-success/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <File className="h-8 w-8 text-success" />
            <div>
              <h3 className="font-medium text-success-foreground">{uploadedFile.name}</h3>
              <p className="text-sm text-muted-foreground">
                {(uploadedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          {onRemoveFile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemoveFile}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-8">
      <div className="text-center mb-4">
        <div className="flex justify-center mb-4">{icon}</div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-4">
          Drag and drop your file here, or click to browse
        </p>
        
        <input
          type="file"
          accept={accept}
          onChange={handleFileInput}
          className="hidden"
          id={`file-input-${title}`}
        />
        
        <Button variant="outline" asChild>
          <label htmlFor={`file-input-${title}`} className="cursor-pointer">
            Choose File
          </label>
        </Button>
      </div>
      
      <p className="text-xs text-muted-foreground mt-2 text-center">
        {accept === '.csv' ? 'CSV should contain URLs in the first column' : 'JSON should contain response data for analysis'}
      </p>
    </Card>
  );
};