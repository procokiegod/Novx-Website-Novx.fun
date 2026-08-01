'use client';

import { useEffect, useState } from 'react';
import { Users, FolderKanban, Terminal, CreditCard, TrendingUp, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminPage() {
  const [stats, setStats] = useState({ users: 0, projects: 0, builds: 0, payments: 0 });
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [recentBuilds, setRecentBuilds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const [u, p, b, pay] = await Promise.all([
        supabase.from('profiles').select('id, email, display_name, plan, role, created_at').order('created_at', { ascending: false }).limit(20),
        supabase.from('projects').select('id, name, status, user_id, created_at').order('created_at', { ascending: false }).limit(20),
        supabase.from('builds').select('id, status, project_id, started_at').order('started_at', { ascending: false }).limit(20),
        supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(20),
      ]);
      setRecentUsers(u.data || []);
      setRecentProjects(p.data || []);
      setRecentBuilds(b.data || []);
      setStats({ users: u.data?.length || 0, projects: p.data?.length || 0, builds: b.data?.length || 0, payments: pay.data?.length || 0 });
      setLoading(false);
    })();
  }, [supabase]);

  if (loading) return <div className="py-20 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="mb-8 text-2xl font-bold md:text-3xl">Admin Panel</h1>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Users" value={stats.users} />
        <StatCard icon={FolderKanban} label="Total Projects" value={stats.projects} />
        <StatCard icon={Terminal} label="Total Builds" value={stats.builds} />
        <StatCard icon={CreditCard} label="Payments" value={stats.payments} />
      </div>

      <Tabs defaultValue="users">
        <TabsList className="mb-4">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="builds">Builds</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card className="glass p-4">
            <div className="space-y-2">
              {recentUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
                  <div>
                    <div className="font-medium">{u.display_name || u.email}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{u.plan}</Badge>
                    {u.role === 'admin' && <Badge variant="outline" className="border-primary/30 text-primary">admin</Badge>}
                    <span className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="projects">
          <Card className="glass p-4">
            <div className="space-y-2">
              {recentProjects.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
                  <div className="font-medium">{p.name}</div>
                  <Badge variant="outline" className="capitalize">{p.status}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="builds">
          <Card className="glass p-4">
            <div className="space-y-2">
              {recentBuilds.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
                  <div className="text-sm">Build #{b.id.slice(0, 8)}</div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={b.status === 'success' ? 'border-success/30 text-success' : b.status === 'failed' ? 'border-destructive/30 text-destructive' : ''}>{b.status}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(b.started_at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <Card className="glass p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="mt-3 text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </Card>
  );
}
