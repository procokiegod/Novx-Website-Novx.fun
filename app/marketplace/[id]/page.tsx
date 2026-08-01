'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Download, Star, MessageSquare, Send, GitFork } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface MarketPlugin {
  id: string;
  title: string;
  description: string;
  category: string;
  downloads: number;
  project_id: string;
  user_id: string;
}

export default function MarketplaceDetailPage() {
  const params = useParams();
  const pluginId = params.id as string;
  const supabase = createClient();
  const [plugin, setPlugin] = useState<MarketPlugin | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const [pRes, cRes] = await Promise.all([
        supabase.from('marketplace_plugins').select('*').eq('id', pluginId).maybeSingle(),
        supabase.from('comments').select('*, profiles(display_name)').eq('marketplace_plugin_id', pluginId).order('created_at', { ascending: false }),
      ]);
      setPlugin(pRes.data);
      setComments(cRes.data || []);
      setLoading(false);
    })();
  }, [pluginId, supabase]);

  async function handleFork() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Please sign in to fork'); return; }
    if (!plugin) return;
    const { data } = await supabase.from('projects').insert({
      user_id: user.id,
      name: `${plugin.title} (fork)`,
      prompt: plugin.description,
      status: 'draft',
    }).select().single();
    if (data) {
      toast.success('Plugin forked to your projects!');
      window.location.href = `/projects/${data.id}`;
    }
  }

  async function handleComment() {
    if (!comment.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Please sign in to comment'); return; }
    const { data } = await supabase.from('comments').insert({
      marketplace_plugin_id: pluginId,
      user_id: user.id,
      content: comment,
    }).select('*, profiles(display_name)').single();
    if (data) {
      setComments([data, ...comments]);
      setComment('');
      toast.success('Comment posted');
    }
  }

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading...</div>;
  if (!plugin) return <div className="py-20 text-center text-muted-foreground">Plugin not found.</div>;

  return (
    <div className="mx-auto max-w-5xl">
      <Card className="glass mb-6 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{plugin.title}</h1>
            <p className="mt-2 text-muted-foreground">{plugin.description}</p>
            <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
              <Badge variant="outline">{plugin.category}</Badge>
              <span className="flex items-center gap-1"><Download className="h-4 w-4" /> {plugin.downloads} downloads</span>
              <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-primary text-primary" /> 5.0</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Download</Button>
            <Button className="bg-gradient-to-r from-primary to-accent text-primary-foreground" onClick={handleFork}>
              <GitFork className="mr-2 h-4 w-4" /> Fork
            </Button>
          </div>
        </div>
      </Card>

      <Card className="glass p-6">
        <h3 className="mb-4 flex items-center gap-2 font-semibold"><MessageSquare className="h-4 w-4" /> Comments</h3>
        <div className="mb-6 flex gap-2">
          <input value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleComment()}
            placeholder="Write a comment..." className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <Button size="icon" onClick={handleComment}><Send className="h-4 w-4" /></Button>
        </div>
        <ScrollArea className="max-h-96">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No comments yet.</p>
          ) : (
            <div className="space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="rounded-lg border border-border bg-secondary/30 p-3">
                  <div className="mb-1 text-xs font-medium">{c.profiles?.display_name || 'Anonymous'}</div>
                  <p className="text-sm text-muted-foreground">{c.content}</p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>
    </div>
  );
}
