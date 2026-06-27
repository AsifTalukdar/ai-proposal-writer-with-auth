-- =============================================
-- ProposalAI: Full Supabase SQL Setup
-- Run this entire file in your Supabase SQL Editor
-- =============================================

-- 1. Users table (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Invite codes table
CREATE TABLE IF NOT EXISTS public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  max_uses INT DEFAULT 1,
  used_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- 3. Usage tracking table
CREATE TABLE IF NOT EXISTS public.usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  proposal_count INT DEFAULT 0,
  month_year TEXT NOT NULL, -- "2025-06" format
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, month_year)
);

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invites_code ON public.invites(code);
CREATE INDEX IF NOT EXISTS idx_invites_active ON public.invites(is_active);
CREATE INDEX IF NOT EXISTS idx_usage_user_month ON public.usage(user_id, month_year);

-- 5. Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies

-- Users: read own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Users: update own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Invites: public can read active codes (for validation during signup)
DROP POLICY IF EXISTS "Public can validate invite codes" ON public.invites;
CREATE POLICY "Public can validate invite codes" ON public.invites
  FOR SELECT USING (is_active = true);

-- Usage: users can read own usage
DROP POLICY IF EXISTS "Users can view own usage" ON public.usage;
CREATE POLICY "Users can view own usage" ON public.usage
  FOR SELECT USING (auth.uid() = user_id);

-- 7. Helper function: auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to users
DROP TRIGGER IF EXISTS users_updated_at ON public.users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Apply trigger to usage
DROP TRIGGER IF EXISTS usage_updated_at ON public.usage;
CREATE TRIGGER usage_updated_at
  BEFORE UPDATE ON public.usage
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 8. Helper function: increment usage count safely (used by backend)
CREATE OR REPLACE FUNCTION public.increment_usage(p_user_id UUID, p_month_year TEXT)
RETURNS INT AS $$
DECLARE
  new_count INT;
BEGIN
  INSERT INTO public.usage (user_id, month_year, proposal_count)
  VALUES (p_user_id, p_month_year, 1)
  ON CONFLICT (user_id, month_year)
  DO UPDATE SET
    proposal_count = usage.proposal_count + 1,
    updated_at = now()
  RETURNING proposal_count INTO new_count;

  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Auto-create user profile on signup (trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to auth.users (Supabase fires this when new user signs up)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- DONE! Your database is ready.
-- =============================================
-- 
-- Next steps:
-- 1. Create invite codes in the SQL editor:
--
-- INSERT INTO public.invites (code, max_uses)
-- VALUES ('PRPSL-BETA01-2025', 10);
--
-- 2. Or use the API: POST /api/invites?action=create
--    with { admin_secret: "your-secret", max_uses: 5 }
--
-- =============================================
