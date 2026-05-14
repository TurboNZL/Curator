import { Search, BookOpen, Trash2, BarChart3, ListOrdered, Settings, User, Laptop, Music2, Youtube, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useMusicStore } from '@/store/useMusicStore';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const TopToolbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeProfile, updateSettings, updatePlaybackMode } = useMusicStore();

  const getSourceIcon = (mode: string) => {
    switch (mode) {
      case 'local': return <Laptop size={14} />;
      case 'spotify': return <Music2 size={14} />;
      case 'youtube': return <Youtube size={14} />;
      case 'soundcloud': return <Cloud size={14} />;
      default: return <Laptop size={14} />;
    }
  };

  return (
    <header className="h-16 border-b border-zinc-800 bg-zinc-950 flex items-center px-6 justify-between gap-4">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4 border-r border-zinc-800 pr-6">
          <ToolbarTab
            icon={BookOpen}
            label="Journal"
            active={location.pathname === '/'}
            onClick={() => navigate('/')}
          />
          <ToolbarTab
            icon={Trash2}
            label="Cleanup"
            active={location.pathname === '/cleanup'}
            onClick={() => navigate('/cleanup')}
          />
          <ToolbarTab
            icon={BarChart3}
            label="Stats"
            active={location.pathname === '/stats'}
            onClick={() => navigate('/stats')}
          />
          <ToolbarTab
            icon={ListOrdered}
            label="Queue"
            active={location.pathname === '/queue'}
            onClick={() => navigate('/queue')}
          />
        </div>
        
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <Input
            placeholder="Search catalog..."
            className="pl-10 bg-zinc-900 border-zinc-800 text-zinc-200 h-9 rounded-full focus-visible:ring-blue-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                navigate(`/tracks?search=${(e.target as HTMLInputElement).value}`);
              }
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 rounded-full px-3 py-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Source</span>
          <Select value={activeProfile.playbackMode} onValueChange={(val: any) => updatePlaybackMode(val)}>
            <SelectTrigger className="h-7 border-none bg-transparent focus:ring-0 text-xs font-bold gap-2 p-0 w-auto">
              <div className="flex items-center gap-2">
                {getSourceIcon(activeProfile.playbackMode)}
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
              <SelectItem value="local" className="text-xs font-bold">Local Files</SelectItem>
              <SelectItem value="spotify" className="text-xs font-bold">Spotify</SelectItem>
              <SelectItem value="youtube" className="text-xs font-bold">YouTube</SelectItem>
              <SelectItem value="soundcloud" className="text-xs font-bold">SoundCloud</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 border border-zinc-700 hover:ring-2 ring-blue-500/50 transition-all" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 bg-zinc-950 border-zinc-800 text-white">
            <DropdownMenuLabel className="flex items-center gap-2">
              <User size={14} />
              <span className="uppercase tracking-widest text-[10px] font-black">{activeProfile.name}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold">Unbalanced First</Label>
                  <p className="text-[10px] text-zinc-500">Show yellow stars as primary</p>
                </div>
                <Switch
                  checked={activeProfile.settings?.showUnbalancedFirst}
                  onCheckedChange={(val) => updateSettings({ showUnbalancedFirst: val })}
                />
              </div>
            </div>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem className="text-xs font-bold uppercase tracking-widest focus:bg-zinc-900 focus:text-blue-400 cursor-pointer">
              <Settings size={14} className="mr-2" /> Profile Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

const ToolbarTab = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center gap-1 group"
  >
    <Icon 
      size={18} 
      className={cn(
        "transition-colors",
        active ? "text-white" : "text-zinc-500 group-hover:text-white"
      )} 
    />
    <span className={cn(
      "text-[10px] uppercase tracking-wider font-bold transition-colors",
      active ? "text-blue-500" : "text-zinc-600 group-hover:text-zinc-400"
    )}>
      {label}
    </span>
  </button>
);