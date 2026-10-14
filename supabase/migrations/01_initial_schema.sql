-- ============================================
-- GamerConnections — Infra Supabase (fase 1: mídia)
-- Como usar: Supabase Dashboard → SQL Editor →
-- cole este arquivo e clique em RUN.
-- ============================================

-- 1) Bucket público "media" (fotos, GIFs e vídeos)
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

-- 2) Leitura pública dos arquivos (qualquer visitante vê)
drop policy if exists "Leitura pública de mídia" on storage.objects;
create policy "Leitura pública de mídia"
on storage.objects for select
using (bucket_id = 'media');

-- 3) Upload liberado (fase demo).
-- Quando ativar o Auth (fase 2), troque por:
--   with check (bucket_id = 'media' and auth.role() = 'authenticated')
drop policy if exists "Upload público de mídia" on storage.objects;
create policy "Upload público de mídia"
on storage.objects for insert
with check (bucket_id = 'media');

-- ============================================
-- 4) Tabela de usuários (cadastros do site)
-- Rode junto ou depois da parte de cima.
-- ============================================
create table if not exists public.profiles (
    username text primary key,
    name text not null,
    email text not null unique,
    birthdate date,
    avatar text,
    password_hash text not null,
    created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Leitura liberada (o site busca o usuário no login)
drop policy if exists "Leitura pública de perfis" on public.profiles;
create policy "Leitura pública de perfis"
on public.profiles for select using (true);

-- Cadastro liberado (fase demo; com Auth, restrinja ao próprio usuário)
drop policy if exists "Cadastro público" on public.profiles;
create policy "Cadastro público"
on public.profiles for insert with check (true);

-- Atualização liberada (fase demo; ex.: trocar avatar)
drop policy if exists "Atualização pública de perfil" on public.profiles;
create policy "Atualização pública de perfil"
on public.profiles for update using (true) with check (true);

-- ============================================
-- 5) Códigos de uso único (ex.: CEO-ACCESS)
-- ============================================
create table if not exists public.redeemed_codes (
    code text primary key,
    used_by text,
    used_at timestamptz not null default now()
);

alter table public.redeemed_codes enable row level security;

drop policy if exists "Leitura de códigos" on public.redeemed_codes;
create policy "Leitura de códigos"
on public.redeemed_codes for select using (true);

drop policy if exists "Registro de uso" on public.redeemed_codes;
create policy "Registro de uso"
on public.redeemed_codes for insert with check (true);

-- ============================================
-- 6) Assinaturas (plano VIP/ELITE/CEO por usuário)
-- ============================================
create table if not exists public.subscriptions (
    username text primary key,
    plan text not null,
    label text,
    updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists "Leitura de assinaturas" on public.subscriptions;
create policy "Leitura de assinaturas"
on public.subscriptions for select using (true);

drop policy if exists "Escrita de assinaturas" on public.subscriptions;
create policy "Escrita de assinaturas"
on public.subscriptions for insert with check (true);

drop policy if exists "Atualização de assinaturas" on public.subscriptions;
create policy "Atualização de assinaturas"
on public.subscriptions for update using (true) with check (true);

drop policy if exists "Remoção de assinaturas" on public.subscriptions;
create policy "Remoção de assinaturas"
on public.subscriptions for delete using (true);

-- ============================================
-- 8) Perfil estendido (colunas novas)
-- ============================================
alter table public.profiles add column if not exists gender text;
alter table public.profiles add column if not exists looking_for text;
alter table public.profiles add column if not exists intents text[];
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists hobbies text[];
alter table public.profiles add column if not exists games text[];
alter table public.profiles add column if not exists photo text;
alter table public.profiles add column if not exists gif_avatar text;
alter table public.profiles add column if not exists banner jsonb;
alter table public.profiles add column if not exists theme int;
alter table public.profiles add column if not exists bg_img text;
alter table public.profiles add column if not exists name_color text;
alter table public.profiles add column if not exists name_font text;
alter table public.profiles add column if not exists badge_color text;
alter table public.profiles add column if not exists banned boolean not null default false;

-- ============================================
-- 9) follows / likes / comentários / ocultos / denúncias
-- ============================================
create table if not exists public.follows (
    follower text not null,
    following text not null,
    created_at timestamptz not null default now(),
    primary key (follower, following)
);
create table if not exists public.post_likes (
    post_id text not null,
    username text not null,
    created_at timestamptz not null default now(),
    primary key (post_id, username)
);
create table if not exists public.comments (
    id text primary key,
    post_id text not null,
    username text not null,
    text text not null,
    created_at timestamptz not null default now()
);
create table if not exists public.hidden_posts (
    username text not null,
    post_id text not null,
    primary key (username, post_id)
);
create table if not exists public.reports (
    id text primary key,
    kind text not null,
    target_id text not null,
    reason text not null,
    details text default '',
    by_username text not null,
    created_at timestamptz not null default now()
);

-- ============================================
-- 10) matches + estado do app + pedidos de amizade
-- ============================================
create table if not exists public.matches (
    owner_username text not null,
    match_id text not null,
    unread int not null default 0,
    messages jsonb not null default '[]',
    updated_at timestamptz not null default now(),
    primary key (owner_username, match_id)
);
create table if not exists public.app_state (
    username text primary key,
    seen text[] not null default '{}',
    likes_date text default '',
    likes_count int not null default 0,
    super_date text default '',
    super_count int not null default 0
);
create table if not exists public.friend_requests (
    to_username text not null,
    from_username text not null,
    created_at timestamptz not null default now(),
    primary key (to_username, from_username)
);

-- ============================================
-- 11) grupos + mensagens de chat
-- ============================================
create table if not exists public.groups (
    id text primary key,
    name text not null,
    owner text not null,
    members text[] not null default '{}',
    code text unique not null,
    created_at timestamptz not null default now()
);
create table if not exists public.chat_messages (
    id text primary key,
    scope text not null,
    scope_id text not null default '',
    username text not null,
    text text not null,
    created_at timestamptz not null default now()
);

-- ============================================
-- 12) mural + bloqueios + tags bloqueadas
-- ============================================
create table if not exists public.wall (
    id text primary key,
    profile_username text not null,
    from_username text not null,
    text text not null,
    created_at timestamptz not null default now()
);
create table if not exists public.blocked (
    username text not null,
    blocked_key text not null,
    blocked_name text default '',
    primary key (username, blocked_key)
);
create table if not exists public.blocked_tags (
    tag text primary key
);

-- ============================================
-- 13) dogtags + destaques + medalhas + pedidos
-- ============================================
create table if not exists public.dogtags_owned (
    username text not null,
    dogtag_id text not null,
    text text default '',
    primary key (username, dogtag_id)
);
create table if not exists public.highlights (
    id text primary key,
    username text not null,
    label text not null,
    img_url text not null,
    position int not null default 0
);
create table if not exists public.medals_equipped (
    username text not null,
    medal_id text not null,
    unlocked_at timestamptz not null default now(),
    primary key (username, medal_id)
);
create table if not exists public.medal_dates (
    username text not null,
    medal_id text not null,
    unlocked_at timestamptz not null default now(),
    primary key (username, medal_id)
);
create table if not exists public.custom_medals (
    id text primary key,
    name text not null,
    icon text not null,
    rule text not null,
    n int not null default 1
);
create table if not exists public.orders (
    code text primary key,
    username text not null,
    items jsonb not null,
    total numeric not null default 0,
    created_at timestamptz not null default now()
);

-- ============================================
-- 14) RLS liberado (fase demo — todas as tabelas)
-- ============================================
alter table public.follows enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;
alter table public.hidden_posts enable row level security;
alter table public.reports enable row level security;
alter table public.matches enable row level security;
alter table public.app_state enable row level security;
alter table public.friend_requests enable row level security;
alter table public.groups enable row level security;
alter table public.chat_messages enable row level security;
alter table public.wall enable row level security;
alter table public.blocked enable row level security;
alter table public.blocked_tags enable row level security;
alter table public.dogtags_owned enable row level security;
alter table public.highlights enable row level security;
alter table public.medals_equipped enable row level security;
alter table public.custom_medals enable row level security;
alter table public.orders enable row level security;

-- ============================================
-- 16) Salas privadas + coluna de dogtag equipada
-- ============================================
create table if not exists public.rooms (
    id text primary key,
    name text not null,
    game text default '',
    password text default '',
    owner text not null,
    created_at timestamptz not null default now()
);

alter table public.rooms enable row level security;

alter table public.profiles add column if not exists equipped_dogtag text;

-- ============================================
-- 15) Policies demo (leitura/escrita liberada)
-- ============================================
do $$
declare
    t text;
    tbls text[] := array['follows','post_likes','comments','hidden_posts','reports','matches','app_state','friend_requests','groups','rooms','chat_messages','wall','blocked','blocked_tags','dogtags_owned','highlights','medals_equipped','custom_medals','orders'];
begin
    foreach t in array tbls loop
        begin execute format('drop policy if exists %I on public.%I', 'demo select ' || t, t); exception when others then null; end;
        begin execute format('create policy %I on public.%I for select using (true)', 'demo select ' || t, t); exception when others then null; end;
        begin execute format('drop policy if exists %I on public.%I', 'demo insert ' || t, t); exception when others then null; end;
        begin execute format('create policy %I on public.%I for insert with check (true)', 'demo insert ' || t, t); exception when others then null; end;
        begin execute format('drop policy if exists %I on public.%I', 'demo update ' || t, t); exception when others then null; end;
        begin execute format('create policy %I on public.%I for update using (true) with check (true)', 'demo update ' || t, t); exception when others then null; end;
        begin execute format('drop policy if exists %I on public.%I', 'demo delete ' || t, t); exception when others then null; end;
        begin execute format('create policy %I on public.%I for delete using (true)', 'demo delete ' || t, t); exception when others then null; end;
    end loop;
end $$;

-- ============================================
-- 7) Posts globais (feed entre aparelhos)
-- ============================================
create table if not exists public.posts (
    id text primary key,
    author_username text not null,
    type text not null default 'photo',
    src text not null,
    caption text default '',
    game text default 'Geral',
    created_at timestamptz not null default now()
);

alter table public.posts enable row level security;

drop policy if exists "Leitura de posts" on public.posts;
create policy "Leitura de posts"
on public.posts for select using (true);

drop policy if exists "Publicar post" on public.posts;
create policy "Publicar post"
on public.posts for insert with check (true);

drop policy if exists "Apagar post" on public.posts;
create policy "Apagar post"
on public.posts for delete using (true);

-- ============================================
-- 6) Gênero, preferência e intenções
-- ============================================
alter table public.profiles add column if not exists gender text;
alter table public.profiles add column if not exists looking_for text;
alter table public.profiles add column if not exists intents text[];
