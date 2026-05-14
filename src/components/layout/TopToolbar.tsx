import { Search, BookOpen, Trash2, BarChart3, ListOrdered, ChevronDown } from 'lucide-react';
import { useMusicStore } from '@/store/useMusicStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

export const TopToolbar = () => {
  const { activeProfile, setPlaybackMode } = useMusicStore();

  return (
    <header className="h-16 border-b border-zinc-800 bg-zinc-950 flex items-center px-6 justify-between gap-4">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4 border-r border-zinc-800 pr-6">
          <ToolbarTab icon={BookOpen} label="Journal" />
          <ToolbarTab icon={Trash2} label="Cleanup" />
          <ToolbarTab icon={BarChart3} label="Stats" />
          <ToolbarTab icon={ListOrdered} label="Queue" />
        </div>
        
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <Input 
            placeholder="Search catalog..." 
            className="pl-10 bg-zinc-900 border-zinc-800 text-zinc-200 h-9 rounded-full focus-visible:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="bg-zinc-900 border-zinc-800 text-zinc-300 h-8 gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              {activeProfile.playbackMode.charAt(0).toUpperCase() + activeProfile.playbackMode.slice(1)}
              <ChevronDown size={14} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
            <DropdownMenuItem onClick={() => setPlaybackMode('local')}>Local Files</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPlaybackMode('spotify')}>Spotify</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPlaybackMode('youtube')}>YouTube</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPlaybackMode('soundcloud')}>SoundCloud</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 border border-zinc-700" />
      </div>
    </header>
  );
};

const ToolbarTab = ({ icon: Icon, label }: { icon: any, label: string }) => (
  <button className="flex flex-col items-center gap-1 group">
    <Icon size={18} className="text-zinc-500 group-hover:text-white transition-colors" />
    <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-600 group-hover:text-zinc-400">
      {label}
    </span>
  </button>
);