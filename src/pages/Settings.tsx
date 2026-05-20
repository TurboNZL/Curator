import React, { useState } from 'react';
import { useMusicStore } from '@/store/useMusicStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Palette, Database, Shield, User, Disc, Music, Plus, Trash2, RefreshCw, Brain, Settings as SettingsIcon, Link as LinkIcon, HardDrive } from 'lucide-react';
import { toast } from 'sonner';
import { FileUpload } from '@/components/ui/FileUpload';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch'; // Added Switch import

const Settings = () => {
  const { activeProfile, updateSettings, updatePlaybackRules, tracks, resetDatabase, clearUnlinkedFiles } = useMusicStore();
  const [newRule, setNewRule] = useState({ trackAId: '', trackBId: '', playFirstOnShuffle: false, applyToAlbumSource: false });

  const handleAddRule = async () => {
    if (!newRule.trackAId || !newRule.trackBId) return toast.error("Both tracks are required for a rule");
    const updatedRules = [...activeProfile.playbackRules, newRule];
    await updatePlaybackRules(updatedRules);
    setNewRule({ trackAId: '', trackBId: '', playFirstOnShuffle: false, applyToAlbumSource: false });
    toast.success("Playback rule added");
  };

  const handleRemoveRule = async (index: number) => {
    const updatedRules = activeProfile.playbackRules.filter((_, i) => i !== index);
    await updatePlaybackRules(updatedRules);
    toast.success("Rule removed");
  };

  const trackOptions = tracks.map(t => ({ value: t.id, label: t.title }));

  const handleClearUnlinkedFiles = async () => {
    if (confirm("Are you sure you want to delete all unlinked files? This action cannot be undone.")) {
      await clearUnlinkedFiles();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white uppercase">System Settings</h1>
        <p className="text-zinc-500 text-sm mt-1">Configure your curation environment and playback rules.</p>
      </div>

      {/* Default Images */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-zinc-900 pb-4">
          <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
            <Palette size={20} />
          </div>
          <h2 className="text-sm font-black uppercase tracking-widest text-white">Visual Defaults</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Default Artist Image</Label>
            <FileUpload
              value={activeProfile.settings?.defaultArtistImage || ''}
              onChange={(url) => updateSettings({ defaultArtistImage: url })}
              type="image"
              accept="image/*"
            />
          </div>
          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Default Album Cover</Label>
            <FileUpload
              value={activeProfile.settings?.defaultAlbumImage || ''}
              onChange={(url) => updateSettings({ defaultAlbumImage: url })}
              type="image"
              accept="image/*"
            />
          </div>
        </div>
      </section>

      {/* Playback Rules */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-zinc-900 pb-4">
          <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
            <RefreshCw size={20} />
          </div>
          <h2 className="text-sm font-black uppercase tracking-widest text-white">Back-to-Back Rules</h2>
        </div>
        
        <div className="p-6 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-2xl space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">When this plays...</Label>
              <SearchableSelect 
                options={trackOptions} 
                value={newRule.trackAId} 
                onValueChange={(val) => setNewRule({...newRule, trackAId: val})}
                placeholder="Search track..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">...Add this to queue</Label>
              <SearchableSelect 
                options={trackOptions} 
                value={newRule.trackBId} 
                onValueChange={(val) => setNewRule({...newRule, trackBId: val})}
                placeholder="Search track..."
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="shuffle-rule" 
                  checked={newRule.playFirstOnShuffle} 
                  onCheckedChange={(val) => setNewRule({...newRule, playFirstOnShuffle: !!val})} 
                />
                <Label htmlFor="shuffle-rule" className="text-[10px] font-black uppercase tracking-widest text-zinc-500 cursor-pointer">
                  Play first when queue shuffled (replaces second song)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="apply-to-album-source-rule" 
                  checked={newRule.applyToAlbumSource} 
                  onCheckedChange={(val) => setNewRule({...newRule, applyToAlbumSource: !!val})} 
                />
                <Label htmlFor="apply-to-album-source-rule" className="text-[10px] font-black uppercase tracking-widest text-zinc-500 cursor-pointer">
                  Apply when playing from album
                </Label>
              </div>
            </div>
          </div>
          <Button onClick={handleAddRule} className="w-full bg-zinc-800 hover:bg-zinc-700 text-[10px] font-black uppercase tracking-widest h-10">
            <Plus size={14} className="mr-2" /> Add Playback Rule
          </Button>
        </div>

        <div className="space-y-3">
          {activeProfile.playbackRules.map((rule, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl group">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{tracks.find(t => t.id === rule.trackAId)?.title}</span>
                  <LinkIcon size={12} className="text-zinc-600" />
                  <span className="text-xs font-bold text-white">{tracks.find(t => t.id === rule.trackBId)?.title}</span>
                </div>
                {rule.playFirstOnShuffle && (
                  <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-[8px] font-black uppercase">Shuffle Priority</Badge>
                )}
                {rule.applyToAlbumSource && (
                  <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[8px] font-black uppercase">Album Source</Badge>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleRemoveRule(i)}>
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Database Management */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-zinc-900 pb-4">
          <div className="p-2 bg-red-500/10 rounded-lg text-red-500">
            <Database size={20} />
          </div>
          <h2 className="text-sm font-black uppercase tracking-widest text-white">Database Management</h2>
        </div>
        <Card className="bg-red-950/10 border-red-900/20 p-8 space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-black text-red-500 uppercase tracking-tight">Factory Reset</h3>
            <p className="text-sm text-zinc-400 leading-relaxed font-medium">
              This will permanently delete all artists, albums, tracks, and curation data. This action cannot be undone.
            </p>
          </div>
          <Button 
            variant="destructive" 
            className="bg-red-600 hover:bg-red-500 font-black uppercase tracking-widest h-12 px-8"
            onClick={() => {
              if (confirm("Are you sure? This will wipe EVERYTHING.")) {
                resetDatabase();
                toast.success("Database wiped.");
              }
            }}
          >
            Wipe Local Database
          </Button>
        </Card>

        {/* New: Clear Unlinked Files Card */}
        <Card className="bg-zinc-900/50 border-zinc-800 p-8 space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
              <HardDrive size={20} className="text-purple-500" />
              File Cleanup
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed font-medium">
              Remove audio and image files from the public/uploads directory that are no longer referenced in your database.
              This helps reclaim storage space and keeps your file system tidy.
            </p>
          </div>
          <Button 
            variant="outline" 
            className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-purple-400 hover:text-purple-300 font-black uppercase tracking-widest h-12 px-8"
            onClick={handleClearUnlinkedFiles}
          >
            <Trash2 size={16} className="mr-2" /> Clear Unlinked Files
          </Button>
        </Card>
      </section>
    </div>
  );
};

export default Settings;