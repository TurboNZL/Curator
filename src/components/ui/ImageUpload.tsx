"use client";

import React, { useState, useCallback } from 'react';
import { Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMusicStore } from '@/store/useMusicStore';
import { toast } from 'sonner';

interface ImageUploadProps {
  value?: string;
  onChange: (value: string) => void;
  className?: string;
}

export const ImageUpload = ({ value, onChange, className }: ImageUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const uploadFile = useMusicStore(state => state.uploadFile);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    
    setIsUploading(true);
    try {
      const url = await uploadFile(file, 'image');
      onChange(url);
      toast.success('Image uploaded');
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  }, [onChange, uploadFile]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div
      className={cn(
        "relative aspect-square rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 cursor-pointer overflow-hidden group",
        isDragging ? "border-blue-500 bg-blue-500/10" : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700",
        isUploading && "opacity-50 pointer-events-none",
        className
      )}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      onClick={() => !value && fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={onFileSelect}
      />

      {value ? (
        <>
          <img src={value} alt="Preview" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button 
              onClick={(e) => { e.stopPropagation(); onChange(''); }}
              className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500">
            <Upload size={24} />
          </div>
          <div className="text-center px-4">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              {isUploading ? 'Uploading...' : 'Drop image here'}
            </p>
            <p className="text-[10px] text-zinc-600 mt-1">or click to browse</p>
          </div>
        </>
      )}
    </div>
  );
};
