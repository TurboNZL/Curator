"use client";

import React, { useRef, useState } from 'react';
import { Upload, Music, X, CheckCircle2, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMusicStore } from '@/store/useMusicStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  value?: string;
  onChange: (url: string, fileName: string) => void;
  accept?: string;
  type?: 'audio' | 'image';
}

export const FileUpload = ({ value, onChange, accept = "audio/*", type = "audio" }: FileUploadProps) => {
  const [fileName, setFileName] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadFile = useMusicStore(state => state.uploadFile);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const url = await uploadFile(file, type);
        setFileName(file.name);
        onChange(url, file.name);
        toast.success(`${type === 'audio' ? 'Audio' : 'Image'} file uploaded`);
      } catch (error) {
        toast.error(`Failed to upload ${type}`);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const Icon = type === 'audio' ? Music : ImageIcon;

  return (
    <div className="space-y-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        className="hidden"
      />
      
      {!value ? (
        <button
          type="button"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="w-full aspect-video border-2 border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-zinc-600 hover:bg-zinc-900/20 transition-all group disabled:opacity-50"
        >
          <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-500 group-hover:text-zinc-300">
            {isUploading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
              {isUploading ? 'Uploading...' : `Upload ${type === 'audio' ? 'Audio' : 'Image'} File`}
            </p>
            <p className="text-[10px] text-zinc-600 mt-1">
              {type === 'audio' ? 'MP3, WAV, or FLAC' : 'JPG, PNG, or WEBP'}
            </p>
          </div>
        </button>
      ) : (
        <div className="flex items-center gap-4 p-4 bg-zinc-900 rounded-xl border border-zinc-800">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden",
            type === 'audio' ? "bg-blue-600/20 text-blue-500" : "bg-purple-600/20 text-purple-500"
          )}>
            {type === 'image' && value ? (
              <img src={value} className="w-full h-full object-cover" alt="" />
            ) : (
              <Icon size={20} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{fileName || (type === 'audio' ? "Audio File Loaded" : "Image Loaded")}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <CheckCircle2 size={10} className="text-emerald-500" />
              <span className="text-[10px] text-zinc-500 uppercase font-bold">Stored on local disk</span>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-zinc-500 hover:text-white"
            onClick={() => onChange("", "")}
          >
            <X size={16} />
          </Button>
        </div>
      )}
    </div>
  );
};
