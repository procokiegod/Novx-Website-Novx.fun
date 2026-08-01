'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Wand2, Loader2, Check, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { MC_VERSIONS, PLATFORMS, JAVA_VERSIONS, DIFFICULTIES } from '@/lib/constants';
import type { ProjectOptions, PipelineStage } from '@/lib/types';

const PLACEHOLDER = `Example:
Create a plugin where players receive $500 every 10 minutes.
Add configurable messages.
Permission novx.money.
Paper 1.21.`;

export default function GeneratePage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [improving, setImproving] = useState(false);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [showOptions, setShowOptions] = useState(true);
  const [options, setOptions] = useState<ProjectOptions>({
    platform: 'Paper',
    mcVersion: '1.21',
    javaVersion: '21',
    pluginName: '',
    packageName: '',
    mainClass: '',
    difficulty: 'Standard',
  });

  async function handleGenerate() {
    if (prompt.trim().length < 10) {
      toast.error('Please enter a more detailed description.');
      return;
    }
    setLoading(true);
    setStages([]);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, options, name: options.pluginName || 'Untitled Plugin' }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Generation failed');
        setLoading(false);
        return;
      }

      // Show completion stages
      setStages([
        { name: 'AI Planner', status: 'done' },
        { name: 'Generate Structure', status: 'done' },
        { name: 'Generate Java', status: 'done' },
        { name: 'Generate plugin.yml', status: 'done' },
        { name: 'Generate config.yml', status: 'done' },
        { name: 'Generate permissions', status: 'done' },
        { name: 'Generate README', status: 'done' },
        { name: 'Create Maven project', status: 'done' },
      ]);

      toast.success('Plugin generated successfully!');
      setTimeout(() => {
        router.push(`/projects/${data.projectId}`);
      }, 1000);
    } catch (error) {
      toast.error('Generation failed. Please try again.');
      setLoading(false);
    }
  }

  async function handleImprove() {
    if (prompt.trim().length < 5) {
      toast.error('Enter a prompt first.');
      return;
    }
    setImproving(true);
    try {
      const res = await fetch('/api/improve-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (res.ok) {
        setPrompt(data.improved);
        toast.success('Prompt improved!');
      } else {
        toast.error(data.error || 'Failed to improve prompt');
      }
    } catch {
      toast.error('Failed to improve prompt');
    }
    setImproving(false);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold md:text-3xl">Generate a Plugin</h1>
        <p className="mt-1 text-muted-foreground">Describe your plugin in plain English. AI will write, compile, and package it.</p>
      </div>

      <Card className="glass p-6">
        {/* Prompt */}
        <div className="mb-6">
          <Label htmlFor="prompt" className="mb-2 block">Plugin Description</Label>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={PLACEHOLDER}
            className="min-h-[160px] resize-y font-mono text-sm"
          />
        </div>

        {/* Options toggle */}
        <button
          onClick={() => setShowOptions(!showOptions)}
          className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          {showOptions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          Configuration Options
        </button>

        <AnimatePresence>
          {showOptions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select value={options.platform} onValueChange={(v) => setOptions({ ...options, platform: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Minecraft Version</Label>
                  <Select value={options.mcVersion} onValueChange={(v) => setOptions({ ...options, mcVersion: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MC_VERSIONS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Java Version</Label>
                  <Select value={options.javaVersion} onValueChange={(v) => setOptions({ ...options, javaVersion: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {JAVA_VERSIONS.map((v) => <SelectItem key={v} value={v}>Java {v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Plugin Name</Label>
                  <Input placeholder="NovxPlugin" value={options.pluginName} onChange={(e) => setOptions({ ...options, pluginName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Package Name</Label>
                  <Input placeholder="com.novx.plugin" value={options.packageName} onChange={(e) => setOptions({ ...options, packageName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Main Class</Label>
                  <Input placeholder="NovxPlugin" value={options.mainClass} onChange={(e) => setOptions({ ...options, mainClass: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select value={options.difficulty} onValueChange={(v) => setOptions({ ...options, difficulty: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DIFFICULTIES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Buttons */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button
            size="lg"
            className="flex-1 bg-gradient-to-r from-primary to-accent text-primary-foreground"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {loading ? 'Generating...' : 'Generate'}
          </Button>
          <Button size="lg" variant="outline" onClick={handleImprove} disabled={improving || loading}>
            {improving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            Improve Prompt
          </Button>
        </div>
      </Card>

      {/* Pipeline progress */}
      {stages.length > 0 && (
        <Card className="glass mt-6 p-6">
          <h3 className="mb-4 text-sm font-semibold">Generation Pipeline</h3>
          <div className="space-y-2">
            {stages.map((stage) => (
              <div key={stage.name} className="flex items-center gap-3 text-sm">
                {stage.status === 'done' ? (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success/20">
                    <Check className="h-3 w-3 text-success" />
                  </div>
                ) : stage.status === 'running' ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : stage.status === 'error' ? (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-muted" />
                )}
                <span className={stage.status === 'done' ? 'text-foreground' : 'text-muted-foreground'}>
                  {stage.name}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
