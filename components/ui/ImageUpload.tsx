import React, { useState, useRef } from 'react';
import Image from 'next/image';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  placeholder?: string;
  accept?: string;
}

export default function ImageUpload({ 
  value, 
  onChange, 
  placeholder = "Click to upload an image",
  accept = "image/*"
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    
    try {
      // For now, create a local object URL as a placeholder
      // In a real implementation, this would upload to Google Cloud Storage
      const objectUrl = URL.createObjectURL(file);
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demonstration, we'll use the object URL
      // In production, this would be the uploaded file's URL from Google Cloud Storage
      onChange(objectUrl);
      
      console.log("File uploaded successfully:", file.name);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <div
        className={`
          glassmorphism-subtle border-2 border-dashed rounded-3xl p-6 text-center 
          cursor-pointer transition-all duration-300
          ${dragActive 
            ? 'border-brand-primary bg-brand-primary/10' 
            : 'border-glass-border-strong hover:border-brand-primary/50'
          }
          ${isUploading ? 'opacity-75 cursor-not-allowed' : ''}
        `}
        onClick={!isUploading ? handleClick : undefined}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {value ? (
          <div className="space-y-4">
            <div className="glassmorphism p-4 rounded-3xl w-fit mx-auto">
              <Image
                src={value}
                alt="Uploaded image"
                width={64}
                height={64}
                className="rounded-2xl object-cover"
              />
            </div>
            <div>
              <p className="text-brand-primary font-medium">Image uploaded successfully</p>
              <p className="text-text-quaternary text-sm">Click to change image</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {isUploading ? (
              <div className="glassmorphism p-4 rounded-3xl w-fit mx-auto">
                <div className="w-12 h-12 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="glassmorphism p-4 rounded-3xl w-fit mx-auto">
                <Image
                  src="/images/upload-icon.svg"
                  alt="Upload"
                  width={48}
                  height={48}
                  className="opacity-60"
                />
              </div>
            )}
            
            <div>
              <p className="text-brand-primary font-medium">
                {isUploading ? 'Uploading...' : placeholder}
              </p>
              <p className="text-text-quaternary text-sm">
                {isUploading ? 'Please wait while we upload your image' : 'or drag and drop'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}