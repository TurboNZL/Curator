import React, { useState } from 'react';
import { useMusicStore } from '@/store/useMusicStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { StickyNote, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface NotesSectionProps {
  entityType: 'artist' | 'album' | 'track';
  entityId: string;
}

export const NotesSection = ({ entityType, entityId }: NotesSectionProps) => {
  const { notes, addNote, deleteNote } = useMusicStore();
  const entityNotes = notes.filter(n => n.entityType === entityType && n.entityId === entityId);
  const [newNote, setNewNote] = useState({ label: '', content: '' });

  const handleAddNote = async () => {
    if (!newNote.content) return toast.error("Note content is required");
    await addNote({
      entityType,
      entityId,
      label: newNote.label,
      content: newNote.content,
      isLinked: false
    });
    setNewNote({ label: '', content: '' });
    toast.success("Note added");
  };

  return (
    <div className="space-y-4">
      {entityNotes.map(note => (
        <div key={note.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2 group/note">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">{note.label || 'Note'}</span>
            <Button 
              type="button"
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 opacity-0 group-hover/note:opacity-100 text-zinc-500 hover:text-red-500"
              onClick={() => deleteNote(note.id)}
            >
              <Trash2 size={12} />
            </Button>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">{note.content}</p>
        </div>
      ))}

      <div className="p-4 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-xl space-y-4">
        <div className="flex items-center gap-2">
          <StickyNote size={14} className="text-zinc-500" />
          <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Add New Note</h4>
        </div>
        <div className="space-y-2">
          <Input 
            placeholder="Label (e.g. Trivia, Background)" 
            value={newNote.label}
            onChange={(e) => setNewNote({...newNote, label: e.target.value})}
            className="bg-zinc-900 border-zinc-800 text-xs"
          />
          <Textarea 
            placeholder="Write your note here..." 
            value={newNote.content}
            onChange={(e) => setNewNote({...newNote, content: e.target.value})}
            className="bg-zinc-900 border-zinc-800 text-sm min-h-[80px]"
          />
          <Button 
            type="button"
            onClick={handleAddNote}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-[10px] font-black uppercase tracking-widest h-8"
          >
            Add Note
          </Button>
        </div>
      </div>
    </div>
  );
};
