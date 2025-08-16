import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, Check, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  title: string;
  onFileSelect: (file: File) => void;
  acceptedFile?: File;
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  title,
  onFileSelect,
  acceptedFile,
  className
}) => {
  const [error, setError] = useState<string>('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    setError('');

    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    if (!validTypes.includes(file.type)) {
      setError('Please upload only Excel files (.xlsx, .xls)');
      return;
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size must be less than 10MB');
      return;
    }

    onFileSelect(file);
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  });

  return (
    <Card className={cn("relative", className)}>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
        
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-300",
            isDragActive
              ? "border-primary bg-accent/50"
              : acceptedFile
              ? "border-success bg-success/5"
              : error
              ? "border-destructive bg-destructive/5"
              : "border-border hover:border-primary hover:bg-accent/20"
          )}
        >
          <input {...getInputProps()} />
          
          {acceptedFile ? (
            <div className="space-y-3">
              <Check className="w-12 h-12 text-success mx-auto" />
              <div>
                <p className="text-sm font-medium text-foreground">{acceptedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(acceptedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onFileSelect(null as any);
                  setError('');
                }}
              >
                Replace File
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {error ? (
                <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
              ) : (
                <Upload className="w-12 h-12 text-muted-foreground mx-auto" />
              )}
              
              <div>
                <p className="text-sm font-medium text-foreground">
                  {isDragActive
                    ? "Drop your Excel file here"
                    : "Drag & drop your Excel file here"
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  or click to browse files
                </p>
              </div>
              
              {error && (
                <p className="text-sm text-destructive font-medium">{error}</p>
              )}
              
              <div className="text-xs text-muted-foreground">
                <p>Supported formats: .xlsx, .xls</p>
                <p>Maximum size: 10MB</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};