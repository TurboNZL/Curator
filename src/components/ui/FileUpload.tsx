"use client";

import React, { useRef, useState } from 'react';
import { Upload, Music, X, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMusicStore } from '@/store/useMusicStore';
import { toast } from 'sonner';

interface FileUploadProps {
  value?: string;
  onChange: (url: string, fileName: string) => void;
  accept?: string;
}

export const FileUpload = ({ value, onChange, accept = "audio/*" }: FileUploadProps) => {
  const [fileName, setFileName] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadFile = useMusicStore(state => state.uploadFile);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const url = await uploadFile(file, 'audio');
        setFileName(file.name);
        onChange(url, file.name);
        toast.success('Audio file uploaded');
      } catch (error) {
        toast.error('Failed to upload audio');
      } finally {
        setIsUploading(false);
      }
    }
  };

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
              {isUploading ? 'Uploading...' : 'Upload Audio File'}
            </p>
            <p className="text-[10px] text-zinc-600 mt-1">MP3, WAV, or FLAC</p>
          </div>
        </button>
      ) : (
        <div className="flex items-center gap-4 p-4 bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-500">
            <Music size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{fileName || "Audio File Loaded"}</p>
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
