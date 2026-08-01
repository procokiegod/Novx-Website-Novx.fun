import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'NOVX AI — Create Minecraft Plugins with AI',
    template: '%s — NOVX AI',
  },
  description:
    'Describe your plugin. Our AI writes it, compiles it, and returns a ready-to-use Paper plugin. The fastest way to build Minecraft plugins.',
  keywords: ['Minecraft plugin generator', 'AI plugin', 'Paper plugin', 'Spigot', 'Bukkit', 'Minecraft development'],
  authors: [{ name: 'NOVX AI' }],
  openGraph: {
    title: 'NOVX AI — Create Minecraft Plugins with AI',
    description: 'Describe your plugin. Our AI writes it, compiles it, and returns a ready-to-use plugin.',
    type: 'website',
    siteName: 'NOVX AI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NOVX AI — Create Minecraft Plugins with AI',
    description: 'Describe your plugin. Our AI writes it, compiles it, and returns a ready-to-use plugin.',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0e14',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="font-sans antialiased min-h-screen bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
