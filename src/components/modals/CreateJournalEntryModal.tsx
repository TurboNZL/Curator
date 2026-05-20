"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useMusicStore } from '@/store/useMusicStore';
import { BookOpen } from 'lucide-react'; // Added icon import
import { toast } from 'sonner';

interface CreateJournalEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateJournalEntryModal = ({ open, onOpenChange }: CreateJournalEntryModalProps) => {
  const addTimelineEntry = useMusicStore((state) => state.addTimelineEntry);
  
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  });

  // Reset form data when the modal opens
  React.useEffect(() => {
    if (open) {
      setFormData({ title: '', description: '' });
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return toast.error("Entry title is required");

    addTimelineEntry({
      type: 'entry',
      title: formData.title,
      description: formData.description,
    });

    toast.success(`Journal entry saved`);
    onOpenChange(false); // Close modal
    setFormData({ title: '', description: '' }); // Reset form
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <BookOpen size={20} className="text-purple-500" />
            Journal Entry
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Entry Title</Label>
            <Input 
              id="title" 
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="e.g. Finished Kendrick Discography" 
              className="bg-zinc-900 border-zinc-800 focus-visible:ring-purple-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Notes</Label>
            <Textarea 
              id="description" 
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="What did you discover today?" 
              className="bg-zinc-900 border-zinc-800 focus-visible:ring-purple-500 min-h-[120px]"
            />
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 font-bold uppercase tracking-wider">
              Save to Journal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};