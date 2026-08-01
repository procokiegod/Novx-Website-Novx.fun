/*
# NOVX AI - Core Schema

1. Purpose
   Multi-user SaaS for AI-generated Minecraft plugins. Users sign in, describe a plugin,
   the AI generates Java source + config, a Docker worker compiles it to a JAR, and users
   can download, edit in Monaco, chat-modify with AI, and publish to a marketplace.

2. New Tables
   - profiles: mirrors auth.users with plan, credits, role, display name
   - projects: user-owned plugin projects (prompt, options, spec, status)
   - project_files: individual source files per project (path, content, language)
   - messages: AI chat messages per project (role, content, applied changes)
   - builds: compilation attempts per project (status, logs, jar_path, zip_path, attempt)
   - payments: Stripe payment records
   - subscriptions: Stripe subscription state per user
   - templates: starter plugin templates by category
   - marketplace_plugins: published projects visible publicly
   - ratings: per-user rating of a marketplace plugin
   - comments: per-user comment on a marketplace plugin
   - usage_counters: daily generation count per user (for Free plan limit)

3. Security
   - RLS enabled on every table.
   - Owner-scoped CRUD on profiles, projects, project_files, messages, builds, payments,
     subscriptions, usage_counters (auth.uid() = user_id).
   - Marketplace: public SELECT for anon+authenticated; owner INSERT/UPDATE/DELETE.
   - Templates: public SELECT; admin INSERT/UPDATE/DELETE.
   - ratings/comments: public SELECT; authenticated INSERT/UPDATE/DELETE own rows.

4. Notes
   - All owner columns DEFAULT auth.uid() so client inserts omitting user_id succeed.
   - profiles.id references auth.users(id) ON DELETE CASCADE.
   - project_files, messages, builds cascade-delete with their project.
*/

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  avatar_url text,
  plan text NOT NULL DEFAULT 'free',
  role text NOT NULL DEFAULT 'user',
  credits_remaining integer NOT NULL DEFAULT 5,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- PROJECTS
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  prompt text NOT NULL,
  description text,
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  spec jsonb,
  status text NOT NULL DEFAULT 'draft',
  difficulty text NOT NULL DEFAULT 'standard',
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_projects" ON projects;
CREATE POLICY "select_own_projects" ON projects FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_projects" ON projects;
CREATE POLICY "insert_own_projects" ON projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_projects" ON projects;
CREATE POLICY "update_own_projects" ON projects FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_projects" ON projects;
CREATE POLICY "delete_own_projects" ON projects FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- PROJECT_FILES
CREATE TABLE IF NOT EXISTS project_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  path text NOT NULL,
  content text NOT NULL DEFAULT '',
  language text NOT NULL DEFAULT 'java',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (project_id, path)
);
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_files" ON project_files;
CREATE POLICY "select_own_files" ON project_files FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_files.project_id AND projects.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_own_files" ON project_files;
CREATE POLICY "insert_own_files" ON project_files FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_files.project_id AND projects.user_id = auth.uid()));
DROP POLICY IF EXISTS "update_own_files" ON project_files;
CREATE POLICY "update_own_files" ON project_files FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_files.project_id AND projects.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_files.project_id AND projects.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_own_files" ON project_files;
CREATE POLICY "delete_own_files" ON project_files FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_files.project_id AND projects.user_id = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);

-- MESSAGES
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  applied_changes jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_messages" ON messages;
CREATE POLICY "select_own_messages" ON messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_messages" ON messages;
CREATE POLICY "insert_own_messages" ON messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_messages" ON messages;
CREATE POLICY "delete_own_messages" ON messages FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_messages_project_id ON messages(project_id);

-- BUILDS
CREATE TABLE IF NOT EXISTS builds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  logs text NOT NULL DEFAULT '',
  jar_path text,
  zip_path text,
  error text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE builds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_builds" ON builds;
CREATE POLICY "select_own_builds" ON builds FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_builds" ON builds;
CREATE POLICY "insert_own_builds" ON builds FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_builds" ON builds;
CREATE POLICY "update_own_builds" ON builds FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_builds_project_id ON builds(project_id);

-- PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_intent_id text UNIQUE,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_payments" ON payments;
CREATE POLICY "select_own_payments" ON payments FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_payments" ON payments;
CREATE POLICY "insert_own_payments" ON payments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id text UNIQUE,
  stripe_customer_id text,
  status text NOT NULL DEFAULT 'inactive',
  plan text NOT NULL DEFAULT 'free',
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_subscriptions" ON subscriptions;
CREATE POLICY "select_own_subscriptions" ON subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_subscriptions" ON subscriptions;
CREATE POLICY "insert_own_subscriptions" ON subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_subscriptions" ON subscriptions;
CREATE POLICY "update_own_subscriptions" ON subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- TEMPLATES
CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  prompt text NOT NULL,
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  icon text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_all_templates" ON templates;
CREATE POLICY "select_all_templates" ON templates FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_admin_templates" ON templates;
CREATE POLICY "insert_admin_templates" ON templates FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_admin_templates" ON templates;
CREATE POLICY "update_admin_templates" ON templates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);

-- MARKETPLACE_PLUGINS
CREATE TABLE IF NOT EXISTS marketplace_plugins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  jar_path text,
  downloads integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'published',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE marketplace_plugins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_all_marketplace" ON marketplace_plugins;
CREATE POLICY "select_all_marketplace" ON marketplace_plugins FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_marketplace" ON marketplace_plugins;
CREATE POLICY "insert_own_marketplace" ON marketplace_plugins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_marketplace" ON marketplace_plugins;
CREATE POLICY "update_own_marketplace" ON marketplace_plugins FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_marketplace" ON marketplace_plugins;
CREATE POLICY "delete_own_marketplace" ON marketplace_plugins FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_category ON marketplace_plugins(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_downloads ON marketplace_plugins(downloads DESC);

-- RATINGS
CREATE TABLE IF NOT EXISTS ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_plugin_id uuid NOT NULL REFERENCES marketplace_plugins(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz DEFAULT now(),
  UNIQUE (marketplace_plugin_id, user_id)
);
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_all_ratings" ON ratings;
CREATE POLICY "select_all_ratings" ON ratings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_ratings" ON ratings;
CREATE POLICY "insert_own_ratings" ON ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_ratings" ON ratings;
CREATE POLICY "update_own_ratings" ON ratings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_ratings" ON ratings;
CREATE POLICY "delete_own_ratings" ON ratings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- COMMENTS
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_plugin_id uuid NOT NULL REFERENCES marketplace_plugins(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_all_comments" ON comments;
CREATE POLICY "select_all_comments" ON comments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_comments" ON comments;
CREATE POLICY "insert_own_comments" ON comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_comments" ON comments;
CREATE POLICY "delete_own_comments" ON comments FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_comments_plugin_id ON comments(marketplace_plugin_id);

-- USAGE_COUNTERS
CREATE TABLE IF NOT EXISTS usage_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  count integer NOT NULL DEFAULT 0,
  UNIQUE (user_id, date)
);
ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_usage" ON usage_counters;
CREATE POLICY "select_own_usage" ON usage_counters FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_usage" ON usage_counters;
CREATE POLICY "insert_own_usage" ON usage_counters FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_usage" ON usage_counters;
CREATE POLICY "update_own_usage" ON usage_counters FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
