import { AuroraBackground } from '@/components/aurora-background';
import { Boxes } from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuroraBackground />
      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <Link href="/" className="mb-8 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent glow-primary">
            <Boxes className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight">NOVX AI</span>
        </Link>
        {children}
      </div>
    </>
  );
}
