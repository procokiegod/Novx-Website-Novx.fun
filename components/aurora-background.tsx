'use client';

import { motion } from 'framer-motion';

export function AuroraBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-background">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <motion.div
        className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full blur-[120px]"
        style={{ background: 'hsl(var(--primary) / 0.15)' }}
        animate={{ x: [0, 100, 0], y: [0, 50, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/3 right-1/4 h-[400px] w-[400px] rounded-full blur-[120px]"
        style={{ background: 'hsl(var(--accent) / 0.12)' }}
        animate={{ x: [0, -80, 0], y: [0, 60, 0], scale: [1, 1.3, 1] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-0 left-1/3 h-[350px] w-[350px] rounded-full blur-[120px]"
        style={{ background: 'hsl(var(--primary) / 0.1)' }}
        animate={{ x: [0, 60, 0], y: [0, -40, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
    </div>
  );
}
