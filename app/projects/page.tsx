'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, Plus, Clock, Copy, Trash2, Package } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  status: string;
  difficulty: string;
  created_at: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filtered, setFiltered] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('projects').select('id, name, status, difficulty, created_at').eq('user_id', user.id).order('created_at', { ascending: false });
      setProjects(data || []);
      setFiltered(data || []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    setFiltered(projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())));
  }, [search, projects]);

  async function handleDelete(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete project');
    } else {
      setProjects(projects.filter((p) => p.id !== id));
      toast.success('Project deleted');
    }
  }

  async function handleDuplicate(project: Project) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('projects').insert({
      user_id: user.id,
      name: `${project.name} (copy)`,
      prompt: '',
      status: 'draft',
      difficulty: project.difficulty,
    }).select().single();
    if (data) {
      toast.success('Project duplicated');
      window.location.reload();
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Projects</h1>
          <p className="mt-1 text-muted-foreground">Manage your generated plugins.</p>
        </div>
        <Button className="bg-gradient-to-r from-primary to-accent text-primary-foreground" asChild>
          <Link href="/generate"><Plus className="mr-2 h-4 w-4" /> New Plugin</Link>
        </Button>
      </div>

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-32 animate-pulse rounded-lg border border-border bg-card/50" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="glass p-12 text-center">
          <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-medium">No projects found</h3>
          <p className="mt-1 text-sm text-muted-foreground">Generate your first plugin to get started.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project, i) => (
            <motion.div key={project.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.03 }}>
              <Card className="glass group h-full p-5 transition-all hover:glow-primary hover:border-primary/30">
                <Link href={`/projects/${project.id}`}>
                  <div className="mb-3 flex items-start justify-between">
                    <h3 className="font-semibold">{project.name}</h3>
                    <StatusBadge status={project.status} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(project.created_at).toLocaleDateString()}</span>
                    <Badge variant="outline" className="text-xs">{project.difficulty}</Badge>
                  </div>
                </Link>
                <div className="mt-4 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button size="sm" variant="ghost" onClick={() => handleDuplicate(project)}>
                    <Copy className="mr-1 h-3 w-3" /> Duplicate
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(project.id)}>
                    <Trash2 className="mr-1 h-3 w-3" /> Delete
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
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
