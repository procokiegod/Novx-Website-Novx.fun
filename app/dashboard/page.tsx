'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, FolderKanban, Zap, TrendingUp, ArrowRight, Clock, Package } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Project {
  id: string;
  name: string;
  status: string;
  created_at: string;
  difficulty: string;
}

interface Profile {
  display_name: string | null;
  plan: string;
  credits_remaining: number;
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [pRes, profRes] = await Promise.all([
        supabase.from('projects').select('id, name, status, created_at, difficulty').eq('user_id', user.id).order('created_at', { ascending: false }).limit(6),
        supabase.from('profiles').select('display_name, plan, credits_remaining').eq('id', user.id).maybeSingle(),
      ]);
      setProjects(pRes.data || []);
      setProfile(profRes.data);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold md:text-3xl">
          Welcome back{profile?.display_name ? `, ${profile.display_name}` : ''}
        </h1>
        <p className="mt-1 text-muted-foreground">Generate, manage, and deploy your Minecraft plugins.</p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FolderKanban} label="Total Projects" value={loading ? '—' : String(projects.length)} />
        <StatCard icon={Zap} label="Plan" value={profile?.plan || 'free'} badge />
        <StatCard icon={Sparkles} label="Credits Left" value={profile ? String(profile.credits_remaining) : '—'} />
        <StatCard icon={TrendingUp} label="This Month" value={String(projects.length)} />
      </div>

      {/* Generate CTA */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="glass mb-8 overflow-hidden p-6">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-lg font-semibold">Generate a new plugin</h2>
              <p className="text-sm text-muted-foreground">Describe what you want and let AI build it.</p>
            </div>
            <Button size="lg" className="bg-gradient-to-r from-primary to-accent text-primary-foreground" asChild>
              <Link href="/generate">
                <Sparkles className="mr-2 h-4 w-4" />
                Start Generating
              </Link>
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* Recent projects */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Projects</h2>
          <Link href="/projects" className="text-sm text-primary hover:underline">View all</Link>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-lg border border-border bg-card/50" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card className="glass p-12 text-center">
            <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">No projects yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Generate your first plugin to get started.</p>
            <Button className="mt-4 bg-gradient-to-r from-primary to-accent text-primary-foreground" asChild>
              <Link href="/generate">Create Plugin</Link>
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, i) => (
              <motion.div key={project.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }}>
                <Link href={`/projects/${project.id}`}>
                  <Card className="glass h-full p-5 transition-all hover:glow-primary hover:border-primary/30">
                    <div className="mb-3 flex items-start justify-between">
                      <h3 className="font-semibold">{project.name}</h3>
                      <StatusBadge status={project.status} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(project.created_at).toLocaleDateString()}</span>
                      <Badge variant="outline" className="text-xs">{project.difficulty}</Badge>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, badge }: { icon: any; label: string; value: string; badge?: boolean }) {
  return (
    <Card className="glass p-5">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        {badge && <Badge variant="outline" className="border-primary/30 text-primary capitalize">{value}</Badge>}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold">{badge ? '' : value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    generating: 'bg-warning/20 text-warning',
    generated: 'bg-accent/20 text-accent',
    compiling: 'bg-warning/20 text-warning',
    compiled: 'bg-success/20 text-success',
    failed: 'bg-destructive/20 text-destructive',
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colors[status] || colors.draft}`}>{status}</span>;
}
