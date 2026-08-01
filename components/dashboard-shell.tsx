'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FolderKanban, LayoutTemplate, Store,
  CreditCard, Settings, ShieldCheck, Boxes, Menu, X,
  Sparkles, LogOut,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
  { label: 'Templates', href: '/templates', icon: LayoutTemplate },
  { label: 'Marketplace', href: '/marketplace', icon: Store },
  { label: 'Billing', href: '/billing', icon: CreditCard },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function DashboardShell({ children, isAdmin }: { children: React.ReactNode; isAdmin?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<{ display_name: string | null; plan: string; credits_remaining: number; role: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('display_name, plan, credits_remaining, role').eq('id', user.id).single();
      if (data) setProfile(data);
    })();
  }, []);

  const allItems = [...navItems];
  if (isAdmin || profile?.role === 'admin') {
    allItems.push({ label: 'Admin', href: '/admin', icon: ShieldCheck });
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success('Signed out');
    router.push('/');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-border bg-card/50 backdrop-blur-xl md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent glow-primary">
              <Boxes className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold">NOVX AI</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {allItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  active
                    ? 'bg-gradient-to-r from-primary/15 to-accent/10 text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-4">
          <Link href="/generate" className="mb-3 block">
            <Button className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground">
              <Sparkles className="mr-2 h-4 w-4" />
              New Plugin
            </Button>
          </Link>

          {profile && (
            <div className="mb-3 rounded-lg border border-border bg-secondary/50 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Plan</span>
                <Badge variant="outline" className="border-primary/30 text-primary capitalize">{profile.plan}</Badge>
              </div>
              {profile.plan === 'free' && (
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Credits</span>
                  <span className="font-medium">{profile.credits_remaining}/5</span>
                </div>
              )}
            </div>
          )}

          <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full justify-start text-muted-foreground">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="fixed left-0 top-0 z-50 h-screen w-64 border-r border-border bg-card md:hidden"
            >
              <div className="flex h-16 items-center justify-between border-b border-border px-6">
                <Link href="/" className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
                    <Boxes className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span className="font-bold">NOVX AI</span>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <nav className="space-y-1 p-4">
                {allItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                      pathname.startsWith(item.href) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="md:pl-64">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-xl md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
              <Boxes className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold">NOVX AI</span>
          </Link>
          <Link href="/generate">
            <Button size="icon" className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </Button>
          </Link>
        </header>

        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
