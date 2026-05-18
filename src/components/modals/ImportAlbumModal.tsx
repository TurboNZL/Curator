import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ImportAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportAlbumModal: React.FC<ImportAlbumModalProps> = ({ isOpen, onClose }) => {
  const [url, setUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    if (!url) {
      toast.error('Please enter a URL');
      return;
    }

    setIsImporting(true);
    try {
      const response = await fetch('/api/import-album', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to import album');
      }

      toast.success('Album import started successfully');
      onClose();
      setUrl('');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
            <Download className="text-blue-500" />
            Import Album
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Enter a YouTube or Spotify URL to import the album into your catalog.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="url" className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              Album URL
            </Label>
            <Input
              id="url"
              placeholder="https://www.youtube.com/playlist?list=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-white focus-visible:ring-blue-500"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-zinc-400 hover:text-white hover:bg-zinc-900"
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-widest text-xs px-8"
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              'Start Import'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
