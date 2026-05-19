import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Input } from './input';
import { Label } from './label';
import { useMusicStore } from '@/store/useMusicStore';
import { toast } from 'sonner';

interface RatingProps {
  trackId: string;
  balanced?: number;
  unbalanced?: number;
  comparisons?: number;
  size?: 'sm' | 'md' | 'lg';
}

const Rating: React.FC<RatingProps> = ({ trackId, balanced, unbalanced, comparisons = 0, size = 'sm' }) => {
  const { updateTrack } = useMusicStore();
  const [editRating, setEditRating] = React.useState<string>(
    (balanced !== undefined && balanced !== null) ? balanced.toFixed(1) : ''
  );
  const [popoverOpen, setPopoverOpen] = React.useState(false);

  React.useEffect(() => {
    setEditRating((balanced !== undefined && balanced !== null) ? balanced.toFixed(1) : '');
  }, [balanced, popoverOpen]); // Update editRating when balanced changes or popover opens

  const displayBalanced = balanced !== undefined && balanced !== null && balanced > 0 ? balanced.toFixed(1) : '?';
  const displayUnbalanced = unbalanced !== undefined && unbalanced !== null && unbalanced > 0 ? unbalanced.toFixed(1) : '?';

  const iconSize = size === 'sm' ? 14 : size === 'md' ? 16 : 18;
  const textSize = size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-md';
  // const detailTextSize = size === 'sm' ? 'text-[9px]' : size === 'md' ? 'text-[10px]' : 'text-xs'; // Not used

  const handleRatingChange = async () => {
    const newRatingVal = parseFloat(editRating);
    if (isNaN(newRatingVal) || newRatingVal < 0 || newRatingVal > 10) {
      toast.error("Rating must be between 0 and 10.");
      return;
    }
    await updateTrack(trackId, { initialRating: newRatingVal });
    toast.success("Rating updated.");
    setPopoverOpen(false);
  };

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "group flex items-center gap-1 rounded-full px-2 h-7",
            "bg-zinc-800/50 border border-zinc-700 hover:bg-zinc-800",
            balanced === undefined || balanced === null || balanced <= 0
              ? "text-zinc-500 hover:text-zinc-300"
              : "text-yellow-400 hover:text-yellow-300"
          )}
        >
          <Star size={iconSize} fill="currentColor" />
          <span className={cn("font-bold font-mono", textSize)}>
            {displayBalanced}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="bg-zinc-950 border-zinc-800 text-white w-64 p-4 space-y-4">
        <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">Rating Details</h4>
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-400 font-bold">Balanced:</span>
            <span className="font-mono text-white flex items-center gap-1">
              <Star size={14} fill="currentColor" className="text-yellow-400" /> {displayBalanced}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-400 font-bold">Unbalanced:</span>
            <span className="font-mono text-white flex items-center gap-1">
              <Star size={14} fill="currentColor" className="text-zinc-500" /> {displayUnbalanced}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-400 font-bold">Comparisons:</span>
            <span className="font-mono text-white">{comparisons}</span>
          </div>
        </div>
        <div className="space-y-2 pt-2 border-t border-zinc-900">
          <Label htmlFor="edit-rating" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Set Initial Rating (0-10)</Label>
          <Input
            id="edit-rating"
            type="number"
            step="0.1"
            min="0"
            max="10"
            value={editRating}
            onChange={(e) => setEditRating(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleRatingChange();
              }
            }}
            className="bg-zinc-900 border-zinc-800 focus-visible:ring-yellow-500"
          />
          <Button onClick={handleRatingChange} className="w-full bg-yellow-600 hover:bg-yellow-500 text-white text-[10px] font-black uppercase">Save Rating</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export { Rating };