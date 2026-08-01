'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, Download, Star, Store } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MARKETPLACE_CATEGORIES } from '@/lib/constants';

interface MarketPlugin {
  id: string;
  title: string;
  description: string;
  category: string;
  downloads: number;
  user_id: string;
}

export default function MarketplacePage() {
  const [plugins, setPlugins] = useState<MarketPlugin[]>([]);
  const [filtered, setFiltered] = useState<MarketPlugin[]>([]);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('marketplace_plugins').select('*').eq('status', 'published').order('downloads', { ascending: false });
      setPlugins(data || []);
      setFiltered(data || []);
      setLoading(false);
    })();
  }, [supabase]);

  useEffect(() => {
    let result = plugins;
    if (category !== 'All') result = result.filter((p) => p.category === category);
    if (search) result = result.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase()));
    setFiltered(result);
  }, [category, search, plugins]);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold md:text-3xl">Marketplace</h1>
        <p className="mt-1 text-muted-foreground">Browse and download community plugins.</p>
      </div>

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search plugins..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {MARKETPLACE_CATEGORIES.map((cat) => (
          <Button key={cat} variant={category === cat ? 'default' : 'outline'} size="sm" onClick={() => setCategory(cat)}
            className={category === cat ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground' : ''}>
            {cat}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-40 animate-pulse rounded-lg border border-border bg-card/50" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="glass p-12 text-center">
          <Store className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-medium">No plugins yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Be the first to publish a plugin to the marketplace.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((plugin, i) => (
            <motion.div key={plugin.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.03 }}>
              <Link href={`/marketplace/${plugin.id}`}>
                <Card className="glass h-full p-5 transition-all hover:glow-primary hover:border-primary/30">
                  <div className="mb-3 flex items-start justify-between">
                    <h3 className="font-semibold">{plugin.title}</h3>
                    <Badge variant="outline" className="text-xs">{plugin.category}</Badge>
                  </div>
                  <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{plugin.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Download className="h-3 w-3" /> {plugin.downloads}</span>
                    <span className="flex items-center gap-1"><Star className="h-3 w-3" /> 5.0</span>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
