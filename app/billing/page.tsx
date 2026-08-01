'use client';

import { useEffect, useState } from 'react';
import { Check, Zap, Crown, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function BillingPage() {
  const [profile, setProfile] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [pRes, sRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle(),
      ]);
      setProfile(pRes.data);
      setSubscription(sRes.data);
      setLoading(false);
    })();
  }, [supabase]);

  async function handleUpgrade() {
    setUpgrading(true);
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Failed to start checkout. Configure Stripe keys to enable billing.');
      }
    } catch {
      toast.error('Failed to start checkout');
    }
    setUpgrading(false);
  }

  if (loading) return <div className="py-20 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" /></div>;

  const isPro = profile?.plan === 'pro';

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-8 text-2xl font-bold md:text-3xl">Billing</h1>

      {/* Current plan */}
      <Card className="glass mb-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Current Plan</h2>
              <Badge variant="outline" className={isPro ? 'border-primary/30 text-primary' : ''}>{profile?.plan || 'free'}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {isPro ? 'Unlimited plugin generations with priority compilation.' : `${profile?.credits_remaining || 0} of 5 daily generations remaining.`}
            </p>
          </div>
          {isPro && subscription && (
            <div className="text-right text-sm text-muted-foreground">
              <div>Renews on {new Date(subscription.current_period_end).toLocaleDateString()}</div>
            </div>
          )}
        </div>
      </Card>

      {/* Plans */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass p-6">
          <div className="mb-2 flex items-center gap-2"><Zap className="h-5 w-5 text-primary" /><h3 className="text-lg font-semibold">Free</h3></div>
          <div className="mb-4 flex items-baseline gap-1"><span className="text-3xl font-bold">$0</span><span className="text-muted-foreground">/month</span></div>
          <ul className="mb-6 space-y-2 text-sm">
            {['5 generations/day', 'AI chat modifications', 'Code editor', 'Download JAR & ZIP'].map((f) => (
              <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> {f}</li>
            ))}
          </ul>
          <Button variant="outline" className="w-full" disabled={!isPro}>Current Plan</Button>
        </Card>

        <Card className="glass relative p-6 border-primary/30 glow-primary">
          <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-accent text-primary-foreground">Pro</Badge>
          <div className="mb-2 flex items-center gap-2"><Crown className="h-5 w-5 text-primary" /><h3 className="text-lg font-semibold">Pro</h3></div>
          <div className="mb-4 flex items-baseline gap-1"><span className="text-3xl font-bold">$19</span><span className="text-muted-foreground">/month</span></div>
          <ul className="mb-6 space-y-2 text-sm">
            {['Unlimited generations', 'Priority compilation', 'Marketplace publishing', 'Advanced AI models', 'Version history', 'Email support'].map((f) => (
              <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> {f}</li>
            ))}
          </ul>
          <Button className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground" disabled={isPro} onClick={handleUpgrade}>
            {upgrading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isPro ? 'Current Plan' : 'Upgrade to Pro'}
          </Button>
        </Card>
      </div>
    </div>
  );
}
