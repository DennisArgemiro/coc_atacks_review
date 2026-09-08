-- ============================================
-- SCHEMA: CoC Attack Analysis System
-- Execute no Supabase SQL Editor
-- ============================================

-- Tabela de ataques
CREATE TABLE IF NOT EXISTS attacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  short_id TEXT NOT NULL UNIQUE,
  player_name TEXT NOT NULL,
  player_id TEXT NOT NULL,
  clan TEXT NOT NULL,
  attack_type TEXT NOT NULL CHECK (attack_type IN ('A Vulso', 'Amistoso')),
  video_url TEXT NOT NULL,
  video_source TEXT DEFAULT 'url' CHECK (video_source IN ('upload', 'url')),
  status TEXT NOT NULL DEFAULT 'Aguardando' CHECK (status IN ('Aguardando', 'Em andamento', 'Respondido')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de avaliações
CREATE TABLE IF NOT EXISTS evaluations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  attack_id UUID NOT NULL REFERENCES attacks(id) ON DELETE CASCADE,
  evaluator_name TEXT,
  strategy INTEGER CHECK (strategy >= 1 AND strategy <= 5),
  funneling INTEGER CHECK (funneling >= 1 AND funneling <= 5),
  improvisation INTEGER CHECK (improvisation >= 1 AND improvisation <= 5),
  spell_usage INTEGER CHECK (spell_usage >= 1 AND spell_usage <= 5),
  hero_skills INTEGER CHECK (hero_skills >= 1 AND hero_skills <= 5),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de critérios de avaliação (configurável via admin)
CREATE TABLE IF NOT EXISTS criteria (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir critérios padrão
INSERT INTO criteria (name, label, sort_order) VALUES
  ('strategy', 'Estratégia', 1),
  ('funneling', 'Afunilamento', 2),
  ('improvisation', 'Improviso', 3),
  ('spell_usage', 'Utilização de Feitiços', 4),
  ('hero_skills', 'Habilidades dos Heróis', 5)
ON CONFLICT (name) DO NOTHING;

-- Tabela de tipos de amistosos (para puxar do banco)
CREATE TABLE IF NOT EXISTS friendly_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir tipos de amistosos padrão
INSERT INTO friendly_types (name) VALUES
  ('War'),
  ('CWL'),
  ('Farming'),
  ('Push'),
  ('Evento')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- FUNÇÕES AUXILIARES (antes das RLS)
-- ============================================

-- Verifica se o usuário é admin (domínio @admin.com)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT email FROM auth.users
    WHERE id = auth.uid()
  ) LIKE '%@admin.com';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Verifica se o usuário é analista ou admin
CREATE OR REPLACE FUNCTION is_analyst_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT email FROM auth.users
    WHERE id = auth.uid()
  ) LIKE '%@analista.com' OR is_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Gera short_id único de 9 caracteres
CREATE OR REPLACE FUNCTION generate_short_id()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..9 LOOP
    result := result || chars[floor(random() * length(chars) + 1)::int];
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RLS (Row Level Security)
-- ============================================
ALTER TABLE attacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendly_types ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS: attacks
-- ============================================

-- Leitura pública (para busca por short_id e listing)
DROP POLICY IF EXISTS "attacks_select_public" ON attacks;
CREATE POLICY "attacks_select_public" ON attacks
  FOR SELECT USING (true);

-- Qualquer um pode inserir (submissão anônima)
DROP POLICY IF EXISTS "attacks_insert_anyone" ON attacks;
CREATE POLICY "attacks_insert_anyone" ON attacks
  FOR INSERT WITH CHECK (true);

-- Apenas admin pode atualizar (mudar status, etc)
DROP POLICY IF EXISTS "attacks_update_admin" ON attacks;
CREATE POLICY "attacks_update_admin" ON attacks
  FOR UPDATE USING (is_admin());

-- Apenas admin pode deletar
DROP POLICY IF EXISTS "attacks_delete_admin" ON attacks;
CREATE POLICY "attacks_delete_admin" ON attacks
  FOR DELETE USING (is_admin());

-- ============================================
-- POLÍTICAS: evaluations
-- ============================================

-- Leitura pública (para exibir no resultado da busca)
DROP POLICY IF EXISTS "evaluations_select_public" ON evaluations;
CREATE POLICY "evaluations_select_public" ON evaluations
  FOR SELECT USING (true);

-- Apenas analista ou admin pode inserir avaliações
DROP POLICY IF EXISTS "evaluations_insert_analyst" ON evaluations;
CREATE POLICY "evaluations_insert_analyst" ON evaluations
  FOR INSERT WITH CHECK (is_analyst_or_admin());

-- Apenas admin pode atualizar avaliações
DROP POLICY IF EXISTS "evaluations_update_admin" ON evaluations;
CREATE POLICY "evaluations_update_admin" ON evaluations
  FOR UPDATE USING (is_admin());

-- Apenas admin pode deletar avaliações
DROP POLICY IF EXISTS "evaluations_delete_admin" ON evaluations;
CREATE POLICY "evaluations_delete_admin" ON evaluations
  FOR DELETE USING (is_admin());

-- ============================================
-- POLÍTICAS: criteria
-- ============================================

-- Leitura pública (para formulário de avaliação)
DROP POLICY IF EXISTS "criteria_select_public" ON criteria;
CREATE POLICY "criteria_select_public" ON criteria
  FOR SELECT USING (true);

-- Apenas admin pode gerenciar critérios
DROP POLICY IF EXISTS "criteria_all_admin" ON criteria;
CREATE POLICY "criteria_all_admin" ON criteria
  FOR ALL USING (is_admin());

-- ============================================
-- POLÍTICAS: friendly_types
-- ============================================

-- Leitura pública (para formulário de submissão)
DROP POLICY IF EXISTS "friendly_types_select_public" ON friendly_types;
CREATE POLICY "friendly_types_select_public" ON friendly_types
  FOR SELECT USING (true);

-- Apenas admin pode gerenciar tipos de amistoso
DROP POLICY IF EXISTS "friendly_types_all_admin" ON friendly_types;
CREATE POLICY "friendly_types_all_admin" ON friendly_types
  FOR ALL USING (is_admin());

-- ============================================
-- STORAGE: Bucket de vídeos
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('attack-videos', 'attack-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Leitura pública dos vídeos
DROP POLICY IF EXISTS "storage_select_public" ON storage.objects;
CREATE POLICY "storage_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'attack-videos');

-- Upload apenas para analista ou admin
DROP POLICY IF EXISTS "storage_insert_analyst" ON storage.objects;
CREATE POLICY "storage_insert_analyst" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'attack-videos' AND is_analyst_or_admin());

-- Delete apenas para admin
DROP POLICY IF EXISTS "storage_delete_admin" ON storage.objects;
CREATE POLICY "storage_delete_admin" ON storage.objects
  FOR DELETE USING (bucket_id = 'attack-videos' AND is_admin());

-- ============================================
-- ÍNDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_attacks_short_id ON attacks(short_id);
CREATE INDEX IF NOT EXISTS idx_attacks_status ON attacks(status);
CREATE INDEX IF NOT EXISTS idx_attacks_created_at ON attacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attacks_clan ON attacks(clan);
CREATE INDEX IF NOT EXISTS idx_evaluations_attack_id ON evaluations(attack_id);
