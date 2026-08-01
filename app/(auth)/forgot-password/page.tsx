'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, MailCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card className="glass-strong w-full max-w-md p-8">
        {sent ? (
          <div className="text-center">
            <MailCheck className="mx-auto mb-4 h-12 w-12 text-primary" />
            <h1 className="text-2xl font-bold">Check your email</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a password reset link to <span className="font-medium text-foreground">{email}</span>.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold">Reset your password</h1>
            <p className="mt-2 text-sm text-muted-foreground">Enter your email and we&apos;ll send you a reset link.</p>
            <form onSubmit={handleReset} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Reset Link
              </Button>
            </form>
          </>
        )}
      </Card>
    </motion.div>
  );
}
