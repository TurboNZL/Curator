"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ImportReviewModal } from './ImportReviewModal'; // New modal import

interface ImportAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportAlbumModal: React.FC<ImportAlbumModalProps> = ({ isOpen, onClose }) => {
  const [url, setUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [reviewData, setReviewData] = useState<any | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

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
        const errorData = await response.json();
        throw new Error(errorData.statusMessage || 'Failed to import album due to a server error.');
      }

      const data = await response.json();
      setReviewData(data);
      setIsReviewModalOpen(true); // Open the review modal
      onClose(); // Close the current modal
      setUrl('');
      toast.success('Album data fetched for review.');
    } catch (error: any) {
      toast.error(error.message || 'An unexpected error occurred during import.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleReviewModalClose = () => {
    setIsReviewModalOpen(false);
    setReviewData(null); // Clear data after review modal closes
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
              <Download className="text-blue-500" size={20} />
              Import
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Enter a YouTube URL to fetch album and track data for review.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="url" className="text-xs font-black uppercase tracking-widest text-zinc-500">
                Album or Playlist URL
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
              className="text-zinc-400 hover:text-white hover:bg-zinc-900 font-bold uppercase tracking-widest text-[10px]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={isImporting}
              className="bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-[10px] px-8"
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fetching Data...
                </>
              ) : (
                'Fetch Data for Review'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {reviewData && (
        <ImportReviewModal
          isOpen={isReviewModalOpen}
          onClose={handleReviewModalClose}
          initialData={reviewData}
        />
      )}
    </>
  );
};