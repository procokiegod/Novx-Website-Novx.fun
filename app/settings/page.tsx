'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, Trash2, Key, Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<any>(null);
  const [displayName, setDisplayName] = useState('');
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      setProfile(data);
      setDisplayName(data?.display_name || '');
    })();
  }, [supabase]);

  async function handleSaveProfile() {
    const { error } = await supabase.from('profiles').update({ display_name: displayName, updated_at: new Date().toISOString() }).eq('id', profile.id);
    if (error) toast.error('Failed to save'); else toast.success('Profile updated');
  }

  async function handleDeleteAccount() {
    if (!confirm('Are you sure? This will permanently delete your account and all projects.')) return;
    const { error } = await supabase.auth.signOut();
    toast.success('Account deletion requested. Contact support to complete.');
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-8 text-2xl font-bold md:text-3xl">Settings</h1>

      {/* Profile */}
      <Card className="glass mb-6 p-6">
        <h2 className="mb-4 text-lg font-semibold">Profile</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Display Name</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={profile?.email || ''} disabled />
          </div>
          <Button onClick={handleSaveProfile} className="bg-gradient-to-r from-primary to-accent text-primary-foreground">Save Changes</Button>
        </div>
      </Card>

      {/* Appearance */}
      <Card className="glass mb-6 p-6">
        <h2 className="mb-4 text-lg font-semibold">Appearance</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            <div>
              <div className="text-sm font-medium">Theme</div>
              <div className="text-xs text-muted-foreground">Switch between dark and light mode</div>
            </div>
          </div>
          <Switch checked={theme === 'dark'} onCheckedChange={(c) => setTheme(c ? 'dark' : 'light')} />
        </div>
      </Card>

      {/* API Keys */}
      <Card className="glass mb-6 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Key className="h-5 w-5" /> API Keys</h2>
        <p className="mb-4 text-sm text-muted-foreground">Manage your API keys for external integrations.</p>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>OpenAI API Key</Label>
            <Input type="password" placeholder="sk-..." />
          </div>
          <div className="space-y-2">
            <Label>Anthropic API Key</Label>
            <Input type="password" placeholder="sk-ant-..." />
          </div>
          <Button variant="outline">Save Keys</Button>
        </div>
      </Card>

      {/* Notifications */}
      <Card className="glass mb-6 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Bell className="h-5 w-5" /> Notifications</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm">Build completion notifications</div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="text-sm">Marketplace comment notifications</div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="text-sm">Product updates and newsletter</div>
            <Switch />
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="glass border-destructive/30 p-6">
        <h2 className="mb-2 text-lg font-semibold text-destructive">Danger Zone</h2>
        <p className="mb-4 text-sm text-muted-foreground">Permanently delete your account and all data.</p>
        <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10" onClick={handleDeleteAccount}>
          <Trash2 className="mr-2 h-4 w-4" /> Delete Account
        </Button>
      </Card>
    </div>
  );
}
