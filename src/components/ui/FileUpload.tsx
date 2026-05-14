"use client";

import React, { useRef, useState } from 'react';
import { Upload, Music, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  value?: string;
  onChange: (url: string, fileName: string) => void;
  accept?: string;
}

export const FileUpload = ({ value, onChange, accept = "audio/*" }: FileUploadProps) => {
  const [fileName, setFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange(reader.result as string, file.name);
      };
      reader.readAsDataURL(file);
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
          onClick={() => fileInputRef.current?.click()}
          className="w-full aspect-video border-2 border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-zinc-600 hover:bg-zinc-900/20 transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-500 group-hover:text-zinc-300">
            <Upload size={20} />
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Upload Audio File</p>
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
              <span className="text-[10px] text-zinc-500 uppercase font-bold">Ready for indexing</span>
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