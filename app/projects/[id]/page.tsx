'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import {
  Loader2, File, Terminal, Download, MessageSquare,
  Send, Sparkles, Wand2, Bug, Zap, BookOpen, Save, Play, ChevronRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const MonacoEditor = dynamic(() => import('@monaco-editor/react').then((m) => m.default), { ssr: false });

interface ProjectFile {
  id: string;
  path: string;
  content: string;
  language: string;
}

interface ChatMessage {
  id: string;
  role: string;
  content: string;
}

const CHAT_SUGGESTIONS = [
  'Add permissions',
  'Make config editable',
  'Support PlaceholderAPI',
  'Support Vault',
  'Add cooldown',
  'Fix errors',
];

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const supabase = useMemo(() => createClient(), []);

  const [project, setProject] = useState<any>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [activeFile, setActiveFile] = useState<ProjectFile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [builds, setBuilds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [compiling, setCompiling] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [aiAction, setAiAction] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const loadProject = useCallback(async () => {
    setLoading(true);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setProject(null);
      setLoading(false);
      return;
    }

    const [pRes, fRes, mRes, bRes] = await Promise.all([
      supabase.from('projects').select('*').eq('id', projectId).maybeSingle(),
      supabase.from('project_files').select('*').eq('project_id', projectId),
      supabase.from('messages').select('*').eq('project_id', projectId).order('created_at', { ascending: true }),
      supabase.from('builds').select('*').eq('project_id', projectId).order('started_at', { ascending: false }),
    ]);

    if (pRes.error) {
      console.error('Failed to load project:', pRes.error);
      toast.error('Failed to load project');
    }

    if (fRes.error) console.error('Failed to load project files:', fRes.error);
    if (mRes.error) console.error('Failed to load messages:', mRes.error);
    if (bRes.error) console.error('Failed to load builds:', bRes.error);

    setProject(pRes.data);
    setFiles(fRes.data || []);
    setActiveFile((current) => {
      if (!fRes.data || fRes.data.length === 0) return null;
      return fRes.data.find((file) => file.id === current?.id) || fRes.data[0];
    });
    setMessages(mRes.data || []);
    setBuilds(bRes.data || []);
    setLoading(false);
  }, [projectId, supabase]);

  useEffect(() => { loadProject(); }, [loadProject]);

  function handleEditorChange(value: string | undefined) {
    if (!activeFile || value === undefined) return;
    setActiveFile({ ...activeFile, content: value });
    setDirty(true);
  }

  async function handleSave() {
    if (!activeFile) return;
    const res = await fetch('/api/files', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, path: activeFile.path, content: activeFile.content }),
    });
    if (res.ok) {
      setDirty(false);
      toast.success('File saved');
    } else {
      toast.error('Failed to save');
    }
  }

  async function handleCompile() {
    setCompiling(true);
    try {
      const res = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Build completed.');
        await loadProject();
      } else {
        toast.error(data.error || 'Build failed. Check logs.');
        await loadProject();
      }
    } catch {
      toast.error('Compilation failed');
    }
    setCompiling(false);
  }

  async function handleChat(message: string) {
    if (!message.trim()) return;
    setChatInput('');
    setChatLoading(true);

    const tempMsg: ChatMessage = { id: 'temp-' + Date.now(), role: 'user', content: message };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, message }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [...prev.filter((m) => m.id !== tempMsg.id), { id: 'resp-' + Date.now(), role: 'assistant', content: data.response }]);
        await loadProject();
        toast.success('Project updated');
      } else {
        toast.error(data.error || 'Chat failed');
        setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
      }
    } catch {
      toast.error('Chat failed');
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
    }
    setChatLoading(false);
  }

  async function handleAIAction(action: 'explain' | 'fix' | 'optimize' | 'feature') {
    if (!activeFile) return;
    setAiAction(action);
    const actionText: Record<string, string> = {
      explain: `Explain this code in ${activeFile.path}`,
      fix: `Fix bugs in ${activeFile.path}`,
      optimize: `Optimize the code in ${activeFile.path}`,
      feature: `Add a new feature to ${activeFile.path}`,
    };
    await handleChat(actionText[action]);
    setAiAction(null);
  }

  if (loading) {
    return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!project) {
    return <div className="text-center py-20"><p className="text-muted-foreground">Project not found.</p></div>;
  }

  const latestBuild = builds[0];

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <button onClick={() => router.push('/projects')} className="hover:text-foreground">Projects</button>
            <ChevronRight className="h-3 w-3" />
            <span>{project.name}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold">{project.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{project.description || project.prompt}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleSave} disabled={!dirty}>
            <Save className="mr-2 h-4 w-4" /> Save
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/download?projectId=${projectId}&type=zip`}>
              <Download className="mr-2 h-4 w-4" /> Source ZIP
            </a>
          </Button>
          <Button size="sm" className="bg-gradient-to-r from-primary to-accent text-primary-foreground" onClick={handleCompile} disabled={compiling}>
            {compiling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Compile
          </Button>
          {latestBuild?.status === 'success' && (
            <>
              <Button variant="outline" size="sm" asChild>
                <a href={`/api/download?projectId=${projectId}&type=jar`} target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-4 w-4" /> JAR
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={`/api/download?projectId=${projectId}&type=zip`} target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-4 w-4" /> ZIP
                </a>
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="code">
        <TabsList className="mb-4">
          <TabsTrigger value="code"><File className="mr-1.5 h-4 w-4" /> Code</TabsTrigger>
          <TabsTrigger value="chat"><MessageSquare className="mr-1.5 h-4 w-4" /> AI Chat</TabsTrigger>
          <TabsTrigger value="logs"><Terminal className="mr-1.5 h-4 w-4" /> Logs</TabsTrigger>
          <TabsTrigger value="readme"><BookOpen className="mr-1.5 h-4 w-4" /> README</TabsTrigger>
        </TabsList>

        {/* Code Tab */}
        <TabsContent value="code">
          <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
            {/* File tree */}
            <Card className="glass h-[600px] overflow-auto p-3">
              <div className="mb-2 px-2 text-xs font-semibold text-muted-foreground">FILES</div>
              {files.map((file) => (
                <button
                  key={file.id}
                  onClick={() => { setActiveFile(file); setDirty(false); }}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                    activeFile?.id === file.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <File className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{file.path.split('/').pop()}</span>
                </button>
              ))}
            </Card>

            {/* Editor + AI actions */}
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => handleAIAction('explain')} disabled={!!aiAction}>
                  {aiAction === 'explain' ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <BookOpen className="mr-1.5 h-3.5 w-3.5" />}
                  Explain
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleAIAction('fix')} disabled={!!aiAction}>
                  {aiAction === 'fix' ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Bug className="mr-1.5 h-3.5 w-3.5" />}
                  Fix Bugs
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleAIAction('optimize')} disabled={!!aiAction}>
                  {aiAction === 'optimize' ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Zap className="mr-1.5 h-3.5 w-3.5" />}
                  Optimize
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleAIAction('feature')} disabled={!!aiAction}>
                  {aiAction === 'feature' ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
                  Add Feature
                </Button>
              </div>

              <Card className="glass overflow-hidden">
                <div className="border-b border-border px-4 py-2 text-xs text-muted-foreground">
                  {activeFile?.path || 'No file selected'}
                </div>
                {activeFile && (
                  <MonacoEditor
                    height="520px"
                    language={activeFile.language}
                    value={activeFile.content}
                    onChange={handleEditorChange}
                    theme="vs-dark"
                    options={{
                      fontSize: 13,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      fontFamily: 'var(--font-jetbrains), monospace',
                      padding: { top: 12, bottom: 12 },
                      automaticLayout: true,
                    }}
                  />
                )}
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Chat Tab */}
        <TabsContent value="chat">
          <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
            <Card className="glass flex h-[600px] flex-col">
              <ScrollArea className="flex-1 p-4">
                {messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-center text-muted-foreground">
                    <div>
                      <MessageSquare className="mx-auto mb-3 h-10 w-10 opacity-50" />
                      <p className="text-sm">Ask AI to modify your plugin.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                          msg.role === 'user' ? 'bg-primary/15 text-foreground' : 'bg-secondary text-foreground'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="rounded-lg bg-secondary px-4 py-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
              <div className="border-t border-border p-4">
                <div className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !chatLoading && handleChat(chatInput)}
                    placeholder="Ask AI to modify your plugin..."
                    className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Button size="icon" onClick={() => handleChat(chatInput)} disabled={chatLoading || !chatInput.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>

            {/* Suggestions */}
            <Card className="glass h-fit p-4">
              <div className="mb-3 text-sm font-semibold">Quick Actions</div>
              <div className="space-y-2">
                {CHAT_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleChat(s)}
                    disabled={chatLoading}
                    className="flex w-full items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                  >
                    <Wand2 className="h-3.5 w-3.5 text-primary" />
                    {s}
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card className="glass p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Build Logs</h3>
              {latestBuild && <Badge variant="outline" className={latestBuild.status === 'success' ? 'border-success/30 text-success' : latestBuild.status === 'failed' ? 'border-destructive/30 text-destructive' : ''}>{latestBuild.status}</Badge>}
            </div>
            {builds.length === 0 ? (
              <p className="text-sm text-muted-foreground">No builds yet. Click Compile to build your plugin.</p>
            ) : (
              <div className="space-y-4">
                {builds.map((build) => (
                  <div key={build.id} className="rounded-lg border border-border bg-background/50 p-4">
                    <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Attempt #{build.attempt} - {new Date(build.started_at).toLocaleString()}</span>
                      <Badge variant="outline" className={build.status === 'success' ? 'border-success/30 text-success' : build.status === 'failed' ? 'border-destructive/30 text-destructive' : 'border-warning/30 text-warning'}>{build.status}</Badge>
                    </div>
                    <pre className="max-h-48 overflow-auto rounded bg-background p-3 font-mono text-xs text-muted-foreground">{build.logs || build.error || 'No logs'}</pre>
                    {build.jar_path && build.status === 'success' && (
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <a href={`/api/download?projectId=${projectId}&type=jar`} target="_blank" rel="noopener noreferrer">
                            <Download className="mr-2 h-3.5 w-3.5" /> Download JAR
                          </a>
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <a href={`/api/download?projectId=${projectId}&type=zip`} target="_blank" rel="noopener noreferrer">
                            <Download className="mr-2 h-3.5 w-3.5" /> Download ZIP
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* README Tab */}
        <TabsContent value="readme">
          <Card className="glass p-6">
            {(() => {
              const readme = files.find((f) => f.path === 'README.md');
              return readme ? (
                <div className="prose prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm">{readme.content}</pre>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No README found.</p>
              );
            })()}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
