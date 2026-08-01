'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Code2, Package, Terminal, Download, Zap, Shield, GitBranch, MessageSquare, Store, Cpu, Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const features = [
  { icon: Cpu, title: 'AI-Powered Generation', description: 'Describe your plugin in plain English. Our AI writes the Java code, plugin.yml, and config files automatically.' },
  { icon: Package, title: 'Docker Compilation', description: 'Every plugin is compiled in an isolated Docker sandbox with CPU, memory, and timeout limits for safety.' },
  { icon: Code2, title: 'Built-in Code Editor', description: 'Edit your generated plugin with Monaco Editor. Full syntax highlighting, live editing, and autosave.' },
  { icon: MessageSquare, title: 'AI Chat Modifications', description: 'Chat with AI to add features, fix bugs, or optimize. Every response modifies your project files directly.' },
  { icon: Store, title: 'Marketplace', description: 'Publish your plugins to the public marketplace. Browse, rate, comment, and fork community plugins.' },
  { icon: GitBranch, title: 'Version History', description: 'Every AI change creates a snapshot. Restore previous versions or duplicate projects anytime.' },
];

const steps = [
  { icon: MessageSquare, title: 'Describe', description: 'Tell us what your plugin should do in plain English.' },
  { icon: Cpu, title: 'AI Writes', description: 'Our AI generates Java code, config, and plugin.yml.' },
  { icon: Terminal, title: 'Compiles', description: 'Docker compiles your plugin with automatic error retry.' },
  { icon: Download, title: 'Download', description: 'Get a ready-to-use .jar file, ready to drop into your server.' },
];

const faqs = [
  { q: 'What Minecraft versions are supported?', a: 'We support Paper, Spigot, Purpur, and Folia across Minecraft 1.18 through 1.21. You select the platform and version when generating.' },
  { q: 'How does the AI generation work?', a: 'You describe your plugin in plain English. Our AI planner breaks it into commands, listeners, permissions, and config. It then generates Java source files, plugin.yml, config.yml, and a Maven project.' },
  { q: 'What happens if compilation fails?', a: 'Compiler errors are fed back into the AI automatically. It fixes the code and retries up to 3 times before reporting a failure.' },
  { q: 'Can I edit the generated code?', a: 'Yes. Every project includes a full Monaco code editor with syntax highlighting, live editing, and autosave. You can also ask the AI to explain, fix, or add features.' },
  { q: 'What is the difference between Free and Pro?', a: 'Free includes 5 plugin generations per day. Pro offers unlimited generations, priority compilation, and marketplace publishing.' },
  { q: 'Is my code private?', a: 'Your projects are private by default. You can optionally publish to the marketplace to share with the community.' },
];

const testimonials = [
  { name: 'Alex Rivera', role: 'Server Owner', content: 'NOVX AI saved me hours of development time. I described a simple economy plugin and had a working .jar in under a minute.', rating: 5 },
  { name: 'Sarah Chen', role: 'Plugin Developer', content: 'The AI chat feature is incredible. I asked it to add Vault support and PlaceholderAPI integration, and it just worked.', rating: 5 },
  { name: 'Marcus Webb', role: 'Network Admin', content: 'Running a network of 200+ players, I needed custom plugins fast. NOVX delivered. The Docker compilation is rock solid.', rating: 5 },
  { name: 'Emma Schmidt', role: 'Minecraft Modder', content: 'The code editor and AI modifications make this the best plugin development tool I have ever used. Game changer.', rating: 5 },
];

export function LandingPage() {
  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative flex min-h-screen items-center justify-center px-4 pt-20">
        <div className="mx-auto max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="outline" className="mb-6 gap-2 border-primary/30 bg-primary/5 px-4 py-1.5 text-sm">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-primary">Powered by Advanced AI</span>
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl"
          >
            Create Minecraft Plugins
            <br />
            <span className="text-gradient">with AI</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl"
          >
            Describe your plugin. Our AI writes it. Compiles it. Returns a ready-to-use plugin.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Button size="lg" className="group bg-gradient-to-r from-primary to-accent text-primary-foreground glow-primary" asChild>
              <Link href="/signup">
                Generate Plugin
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#how-it-works">View Examples</Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-muted-foreground"
          >
            <div className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> No Java knowledge needed</div>
            <div className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Paper, Spigot, Purpur, Folia</div>
            <div className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Instant .jar download</div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative px-4 py-24">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mx-auto mb-16 max-w-2xl text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything you need to build plugins</h2>
            <p className="mt-4 text-lg text-muted-foreground">From idea to compiled .jar in minutes, not hours.</p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
              >
                <Card className="glass h-full p-6 transition-all hover:glow-primary hover:border-primary/30">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative px-4 py-24">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mx-auto mb-16 max-w-2xl text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How It Works</h2>
            <p className="mt-4 text-lg text-muted-foreground">Four steps from idea to deployment.</p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent glow-primary">
                  <step.icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <div className="mb-2 text-sm font-medium text-primary">Step {i + 1}</div>
                <h3 className="mb-2 text-xl font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
                {i < steps.length - 1 && (
                  <div className="absolute top-7 left-14 hidden h-0.5 w-full bg-gradient-to-r from-primary/30 to-transparent lg:block" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative px-4 py-24">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mx-auto mb-16 max-w-2xl text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Simple, transparent pricing</h2>
            <p className="mt-4 text-lg text-muted-foreground">Start free. Upgrade when you need more.</p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Card className="glass h-full p-8">
                <h3 className="text-xl font-semibold">Free</h3>
                <p className="mt-1 text-sm text-muted-foreground">For trying things out</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="mt-8 space-y-3 text-sm">
                  {['5 plugin generations/day', 'AI chat modifications', 'Code editor access', 'Download JAR & ZIP', 'Community templates'].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" /> {item}
                    </li>
                  ))}
                </ul>
                <Button className="mt-8 w-full" variant="outline" asChild>
                  <Link href="/signup">Get Started</Link>
                </Button>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="glass relative h-full p-8 border-primary/30 glow-primary">
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-accent text-primary-foreground">Most Popular</Badge>
                <h3 className="text-xl font-semibold">Pro</h3>
                <p className="mt-1 text-sm text-muted-foreground">For power users</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">$19</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="mt-8 space-y-3 text-sm">
                  {['Unlimited generations', 'Priority compilation', 'Marketplace publishing', 'Advanced AI models', 'Version history', 'Email support'].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" /> {item}
                    </li>
                  ))}
                </ul>
                <Button className="mt-8 w-full bg-gradient-to-r from-primary to-accent text-primary-foreground" asChild>
                  <Link href="/signup?plan=pro">Upgrade to Pro</Link>
                </Button>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative px-4 py-24">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mx-auto mb-16 max-w-2xl text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Loved by Minecraft developers</h2>
            <p className="mt-4 text-lg text-muted-foreground">Join thousands of server owners building plugins with AI.</p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
              >
                <Card className="glass h-full p-6">
                  <div className="mb-4 flex gap-1">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="mb-4 text-sm text-muted-foreground">{t.content}</p>
                  <div>
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative px-4 py-24">
        <div className="mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-16 text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Frequently Asked Questions</h2>
          </motion.div>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq) => (
              <AccordionItem key={faq.q} value={faq.q} className="glass rounded-lg px-6">
                <AccordionTrigger className="text-left text-base font-medium hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="relative px-4 py-24">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Card className="glass-strong p-12 text-center glow-primary">
              <Zap className="mx-auto mb-4 h-12 w-12 text-primary" />
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to build your first plugin?</h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">Join NOVX AI and generate your first Minecraft plugin in minutes.</p>
              <Button size="lg" className="mt-8 bg-gradient-to-r from-primary to-accent text-primary-foreground glow-primary" asChild>
                <Link href="/signup">Get Started Free</Link>
              </Button>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-border/50 px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-bold">NOVX AI</span>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">Create Minecraft plugins with AI. From idea to .jar in minutes.</p>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#features" className="hover:text-foreground">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-foreground">Pricing</Link></li>
                <li><Link href="/templates" className="hover:text-foreground">Templates</Link></li>
                <li><Link href="/marketplace" className="hover:text-foreground">Marketplace</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/docs" className="hover:text-foreground">Documentation</Link></li>
                <li><Link href="#faq" className="hover:text-foreground">FAQ</Link></li>
                <li><Link href="/login" className="hover:text-foreground">Login</Link></li>
                <li><Link href="/signup" className="hover:text-foreground">Sign Up</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-foreground">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-border/50 pt-8 text-center text-sm text-muted-foreground">
            <p>NOVX AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
