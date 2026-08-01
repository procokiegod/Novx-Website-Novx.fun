'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Coins, Sword, Crown, MessageSquare, MapPin, Home, Package, User, Gamepad2, Shield, Gavel, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TEMPLATE_CATEGORIES } from '@/lib/constants';

const ICONS: Record<string, any> = {
  Coins, Sword, Crown, MessageSquare, MapPin, Home, Package, User, Gamepad2, Shield, Gavel,
};

interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  prompt: string;
  options: any;
  icon: string | null;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filtered, setFiltered] = useState<Template[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data } = await supabase.from('templates').select('*').order('category');
      setTemplates(data || []);
      setFiltered(data || []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    let result = templates;
    if (activeCategory !== 'All') result = result.filter((t) => t.category === activeCategory);
    if (search) result = result.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase()));
    setFiltered(result);
  }, [activeCategory, search, templates]);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold md:text-3xl">Templates</h1>
        <p className="mt-1 text-muted-foreground">Start from a pre-built plugin template.</p>
      </div>

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search templates..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {['All', ...TEMPLATE_CATEGORIES].map((cat) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory(cat)}
            className={activeCategory === cat ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground' : ''}
          >
            {cat}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-40 animate-pulse rounded-lg border border-border bg-card/50" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((template, i) => {
            const Icon = ICONS[template.icon || 'Package'] || Package;
            return (
              <motion.div key={template.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.03 }}>
                <Card className="glass group h-full p-5 transition-all hover:glow-primary hover:border-primary/30">
                  <div className="mb-3 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{template.name}</h3>
                      <Badge variant="outline" className="mt-1 text-xs">{template.category}</Badge>
                    </div>
                  </div>
                  <p className="mb-4 text-sm text-muted-foreground">{template.description}</p>
                  <Button size="sm" className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground" asChild>
                    <Link href={`/generate?template=${template.id}`}>Use Template</Link>
                  </Button>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
