-- ============================================
-- GamerConnections — RLS Estrito (schema atual)
-- Rode APÓS o supabase-schema.sql original
-- ============================================

-- 1) Habilita RLS em todas as tabelas
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_likes enable row level security;
alter table public.follows enable row level security;
alter table public.chat_messages enable row level security;
alter table public.groups enable row level security;
alter table public.matches enable row level security;
alter table public.friend_requests enable row level security;
alter table public.wall enable row level security;
alter table public.highlights enable row level security;
alter table public.medals_equipped enable row level security;
alter table public.dogtags_owned enable row level security;
alter table public.subscriptions enable row level security;
alter table public.app_state enable row level security;
alter table public.blocked enable row level security;
alter table public.custom_medals enable row level security;
alter table public.blocked_tags enable row level security;
alter table public.orders enable row level security;
alter table public.medal_dates enable row level security;
alter table public.redeemed_codes enable row level security;

-- ============================================
-- 2) PROFILES
-- Leitura: pública (para @username funcionar)
-- Escrita: próprio usuário (via auth.uid())
-- ============================================
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select using (true);

drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles for insert with check (
  auth.uid()::text = username 
  or auth.role() = 'service_role'
);

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update using (
  auth.uid()::text = username
);

-- ============================================
-- 3) POSTS
-- ============================================
drop policy if exists "posts_select" on public.posts;
create policy "posts_select" on public.posts for select using (true);

drop policy if exists "posts_insert" on public.posts;
create policy "posts_insert" on public.posts for insert with check (
  auth.uid()::text = author_username
);

drop policy if exists "posts_update" on public.posts;
create policy "posts_update" on public.posts for update using (
  auth.uid()::text = author_username
);

drop policy if exists "posts_delete" on public.posts;
create policy "posts_delete" on public.posts for delete using (
  auth.uid()::text = author_username
);

-- ============================================
-- 4) COMMENTS
-- ============================================
drop policy if exists "comments_select" on public.comments;
create policy "comments_select" on public.comments for select using (true);

drop policy if exists "comments_insert" on public.comments;
create policy "comments_insert" on public.comments for insert with check (
  auth.uid()::text = username
);

drop policy if exists "comments_update" on public.comments;
create policy "comments_update" on public.comments for update using (
  auth.uid()::text = username
);

drop policy if exists "comments_delete" on public.comments;
create policy "comments_delete" on public.comments for delete using (
  auth.uid()::text = username
);

-- ============================================
-- 5) POST_LIKES
-- Leitura: próprio like OU autor do post
-- Escrita: próprio usuário
-- ============================================
drop policy if exists "likes_select" on public.post_likes;
create policy "likes_select" on public.post_likes for select using (
  auth.uid()::text = username 
  or auth.uid()::text = (select author_username from public.posts where id = post_id)
);

drop policy if exists "likes_upsert" on public.post_likes;
create policy "likes_upsert" on public.post_likes for insert with check (
  auth.uid()::text = username
);

drop policy if exists "likes_delete" on public.post_likes;
create policy "likes_delete" on public.post_likes for delete using (
  auth.uid()::text = username
);

-- ============================================
-- 6) FOLLOWS
-- Leitura: quem segue OU quem é seguido
-- Escrita: próprio usuário (follower)
-- ============================================
drop policy if exists "follows_select" on public.follows;
create policy "follows_select" on public.follows for select using (
  auth.uid()::text = follower 
  or auth.uid()::text = following
);

drop policy if exists "follows_insert" on public.follows;
create policy "follows_insert" on public.follows for insert with check (
  auth.uid()::text = follower
);

drop policy if exists "follows_delete" on public.follows;
create policy "follows_delete" on public.follows for delete using (
  auth.uid()::text = follower
);

-- ============================================
-- 7) CHAT_MESSAGES
-- Global: todos leem
-- Grupo: membros do grupo (owner OU members array)
-- DM: participantes (scope_id = 'user1,user2')
-- Escrita: próprio username
-- ============================================
drop policy if exists "chat_select" on public.chat_messages;
create policy "chat_select" on public.chat_messages for select using (
  scope = 'global'
  or (
    scope = 'group' 
    and exists (
      select 1 from public.groups 
      where id = chat_messages.scope_id 
      and (owner = auth.uid()::text or auth.uid()::text = any(members))
    )
  )
  or (
    scope = 'dm' 
    and (
      scope_id = auth.uid()::text 
      or scope_id like auth.uid()::text || ',%' 
      or scope_id like '%,' || auth.uid()::text
      or scope_id like '%,' || auth.uid()::text || ',%'
    )
  )
);

drop policy if exists "chat_insert" on public.chat_messages;
create policy "chat_insert" on public.chat_messages for insert with check (
  auth.uid()::text = username
);

-- ============================================
-- 8) GROUPS
-- Leitura: todos (públicos) OU membros (privados via code)
-- Criação: qualquer autenticado
-- Update/Delete: owner
-- ============================================
drop policy if exists "groups_select" on public.groups;
create policy "groups_select" on public.groups for select using (true);

drop policy if exists "groups_insert" on public.groups;
create policy "groups_insert" on public.groups for insert with check (
  auth.uid()::text = owner
);

drop policy if exists "groups_update" on public.groups;
create policy "groups_update" on public.groups for update using (
  auth.uid()::text = owner
);

drop policy if exists "groups_delete" on public.groups;
create policy "groups_delete" on public.groups for delete using (
  auth.uid()::text = owner
);

-- ============================================
-- 9) MATCHES (owner_username = usuário logado)
-- ============================================
drop policy if exists "matches_all" on public.matches;
create policy "matches_all" on public.matches for all using (
  auth.uid()::text = owner_username
);

-- ============================================
-- 10) FRIEND_REQUESTS
-- Leitura: to_username (destinatário) OU from_username (remetente)
-- Insert: próprio usuário como from_username
-- Delete: destinatário (aceita/recusa) OU remetente (cancela)
-- ============================================
drop policy if exists "fr_select" on public.friend_requests;
create policy "fr_select" on public.friend_requests for select using (
  auth.uid()::text = to_username 
  or auth.uid()::text = from_username
);

drop policy if exists "fr_insert" on public.friend_requests;
create policy "fr_insert" on public.friend_requests for insert with check (
  auth.uid()::text = from_username
);

drop policy if exists "fr_delete" on public.friend_requests;
create policy "fr_delete" on public.friend_requests for delete using (
  auth.uid()::text = to_username 
  or auth.uid()::text = from_username
);

-- ============================================
-- 11) WALL (mural do perfil)
-- Leitura: todos
-- Escrita: quem posta (from_username)
-- Delete: dono do mural (profile_username) OU autor da mensagem
-- ============================================
drop policy if exists "wall_select" on public.wall;
create policy "wall_select" on public.wall for select using (true);

drop policy if exists "wall_insert" on public.wall;
create policy "wall_insert" on public.wall for insert with check (
  auth.uid()::text = from_username
);

drop policy if exists "wall_delete" on public.wall;
create policy "wall_delete" on public.wall for delete using (
  auth.uid()::text = profile_username 
  or auth.uid()::text = from_username
);

-- ============================================
-- 12) HIGHLIGHTS (destaques do perfil)
-- ============================================
drop policy if exists "hl_all" on public.highlights;
create policy "hl_all" on public.highlights for all using (
  auth.uid()::text = username
);

-- ============================================
-- 13) MEDALS_EQUIPPED
-- ============================================
drop policy if exists "medals_all" on public.medals_equipped;
create policy "medals_all" on public.medals_equipped for all using (
  auth.uid()::text = username
);

-- ============================================
-- 14) DOGTAGS_OWNED
-- ============================================
drop policy if exists "dt_all" on public.dogtags_owned;
create policy "dt_all" on public.dogtags_owned for all using (
  auth.uid()::text = username
);

-- ============================================
-- 15) SUBSCRIPTIONS
-- ============================================
drop policy if exists "sub_all" on public.subscriptions;
create policy "sub_all" on public.subscriptions for all using (
  auth.uid()::text = username
);

-- ============================================
-- 16) APP_STATE
-- ============================================
drop policy if exists "app_all" on public.app_state;
create policy "app_all" on public.app_state for all using (
  auth.uid()::text = username
);

-- ============================================
-- 17) BLOCKED
-- ============================================
drop policy if exists "blocked_all" on public.blocked;
create policy "blocked_all" on public.blocked for all using (
  auth.uid()::text = username
);

-- ============================================
-- 18) CUSTOM_MEDALS (admin only para write)
-- Leitura: todos | Escrita: apenas CEO/OWNER (via service_role)
-- ============================================
drop policy if exists "cm_select" on public.custom_medals;
create policy "cm_select" on public.custom_medals for select using (true);

drop policy if exists "cm_write" on public.custom_medals;
create policy "cm_write" on public.custom_medals for all using (
  auth.role() = 'service_role'
);

-- ============================================
-- 19) BLOCKED_TAGS (admin only)
-- ============================================
drop policy if exists "bt_select" on public.blocked_tags;
create policy "bt_select" on public.blocked_tags for select using (true);

drop policy if exists "bt_write" on public.blocked_tags;
create policy "bt_write" on public.blocked_tags for all using (
  auth.role() = 'service_role'
);

-- ============================================
-- 20) ORDERS (próprio usuário + admin)
-- ============================================
drop policy if exists "orders_select" on public.orders;
create policy "orders_select" on public.orders for select using (
  auth.uid()::text = username
  or auth.role() = 'service_role'
);

drop policy if exists "orders_insert" on public.orders;
create policy "orders_insert" on public.orders for insert with check (
  auth.uid()::text = username
);

-- ============================================
-- 21) MEDAL_DATES
-- ============================================
drop policy if exists "md_all" on public.medal_dates;
create policy "md_all" on public.medal_dates for all using (
  auth.uid()::text = username
);

-- ============================================
-- 22) REDEEMED_CODES (admin write, user read own)
-- ============================================
drop policy if exists "rc_select" on public.redeemed_codes;
create policy "rc_select" on public.redeemed_codes for select using (
  auth.uid()::text = used_by
  or auth.role() = 'service_role'
);

drop policy if exists "rc_insert" on public.redeemed_codes;
create policy "rc_insert" on public.redeemed_codes for insert with check (
  auth.role() = 'service_role'
  or auth.uid()::text = used_by
);

-- ============================================
-- 23) STORAGE BUCKET "media"
-- ============================================
-- Leitura pública
drop policy if exists "media_public_read" on storage.objects;
create policy "media_public_read" on storage.objects for select using (bucket_id = 'media');

-- Upload: autenticado, pasta própria
drop policy if exists "media_auth_upload" on storage.objects;
create policy "media_auth_upload" on storage.objects for insert with check (
  bucket_id = 'media' 
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Update/Delete: próprio arquivo
drop policy if exists "media_own_update" on storage.objects;
create policy "media_own_update" on storage.objects for update using (
  bucket_id = 'media' 
  and auth.uid()::text = owner
);

drop policy if exists "media_own_delete" on storage.objects;
create policy "media_own_delete" on storage.objects for delete using (
  bucket_id = 'media' 
  and auth.uid()::text = owner
);

-- ============================================
-- 24) Função helper para auth.uid() como text
-- (Supabase já expõe auth.uid() como uuid, cast para text funciona)
-- ============================================
-- Nenhuma função extra necessária - auth.uid()::text funciona direto

-- ============================================
-- VERIFICAÇÃO RÁPIDA
-- ============================================
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, policyname;