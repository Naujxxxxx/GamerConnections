# GamerConnections v2.0

Rede social gamer completa — Desktop (Electron) + Web (Vite + TypeScript + Supabase)

## 🚀 Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| **Frontend** | TypeScript + Vite + Preact (via htm) |
| **State** | Zustand (stores centralizados + persistência) |
| **Backend** | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| **Desktop** | Electron 28 + electron-builder |
| **Deploy** | Netlify (web) + GitHub Actions (CI/CD) |
| **Estilo** | CSS Variables + Design System próprio |

## 📁 Estrutura do Projeto

```
gamerconnections/
├── src/
│   ├── main.ts                 # Entry point
│   ├── app.ts                  # App initialization
│   ├── router.ts               # SPA Router
│   ├── config/
│   │   ├── supabase.ts         # Client tipado
│   │   └── constants.ts        # Constantes do app
│   ├── stores/                 # Zustand stores
│   │   ├── auth.ts             # Auth + user + plan
│   │   ├── feed.ts             # Posts, likes, comments
│   │   ├── chat.ts             # Canais, mensagens
│   │   ├── matches.ts          # Swipe, matches
│   │   ├── notifications.ts    # Sistema de notificações
│   │   └── ui.ts               # Modals, toasts, sidebar
│   ├── services/
│   │   ├── supabase.ts         # CRUD tipado
│   │   ├── realtime.ts         # Subscriptions Supabase Realtime
│   │   ├── webrtc.ts           # WebRTC signaling
│   │   └── storage.ts          # Upload de mídia
│   ├── components/
│   │   ├── App.tsx             # Shell principal
│   │   ├── Discover.tsx        # Swipe cards
│   │   ├── Feed.tsx            # Feed global
│   │   ├── Chat.tsx            # Chat global/grupos/DMs
│   │   ├── Matches.tsx         # Matches list
│   │   └── Profile.tsx         # Perfil completo
│   ├── hooks/
│   │   ├── useAuth.ts          # Auth helpers
│   │   ├── useRealtime.ts      # Realtime subscriptions
│   │   └── useWebRTC.ts        # WebRTC calls
│   ├── types/                  # Types TypeScript
│   ├── utils/                  # Helpers (crypto, date, validation)
│   └── styles/                 # CSS Design System
├── electron/
│   ├── main.ts                 # Electron main process
│   ├── preload.ts              # Secure IPC bridge
│   └── util.ts
├── supabase/
│   ├── functions/
│   │   └── hash-password/      # Edge Function SHA-256
│   └── migrations/             # SQL migrations
├── public/                     # Assets estáticos
├── .github/workflows/          # CI/CD
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env.local                  # Variáveis locais
```

## ⚡ Início Rápido

### 1. Pré-requisitos
- Node.js 20+
- Conta no [Supabase](https://supabase.com)
- (Opcional) Netlify para deploy web

### 2. Clone e Instale
```bash
git clone <repo>
cd gamerconnections
npm install
```

### 3. Configure Supabase
1. Crie projeto no [Supabase Dashboard](https://app.supabase.com)
2. Copie **Project URL** e **anon public key** em Settings → API
3. Crie `.env.local`:
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima
```
4. Rode o SQL em `supabase-schema.sql` no **SQL Editor** do Supabase
5. Rode `supabase-rls-fixed.sql` para policies de segurança

### 4. Deploy Edge Function (Hash de Senha)
```bash
# Instale Supabase CLI
npm i -g supabase

# Login e link
supabase login
supabase link --project-ref SEU_PROJECT_REF

# Deploy
supabase functions deploy hash-password
```

### 5. Desenvolvimento
```bash
# Web (Vite dev server)
npm run dev

# Electron + Vite (concurrent)
npm run electron:dev
```

### 6. Build
```bash
# Build web (para Netlify)
npm run build

# Build Electron (portable .exe + NSIS installer)
npm run electron:build
```

## 🔐 Segurança Implementada

- **RLS (Row Level Security)** em todas as tabelas
- **Supabase Auth** nativo (email/password + OAuth Discord)
- **Hash SHA-256** server-side via Edge Function
- **CSP + Headers** via `netlify.toml`
- **Preload script** Electron com `contextIsolation: true`
- **Validação Zod** em todos os inputs

## 🌐 Tempo Real (Supabase Realtime)

| Feature | Canal |
|---------|-------|
| Chat Global | `chat_messages` (scope=global) |
| Grupos | `chat_messages` (scope=group) |
| DMs | `chat_messages` (scope=dm) |
| Feed (likes/comments/posts) | `posts`, `post_likes`, `comments` |
| Notificações | `notifications` (por usuário) |
| WebRTC Signaling | Broadcast channel |

## 📱 Funcionalidades Principais

### Autenticação
- ✅ Email/password com hash server-side
- ✅ OAuth Discord (provider nativo Supabase)
- ✅ Sessão persistente + refresh automático
- ✅ Verificação de idade (13+)

### Feed
- ✅ Posts foto/vídeo (≤30s)
- ✅ Likes, comentários, hashtags, menções
- ✅ Seguir/Deixar de seguir
- ✅ Scroll infinito + pull-to-refresh

### Descobrir (Tinder-style)
- ✅ Swipe like/pass/superlike
- ✅ Filtro por gênero + interesses
- ✅ Limites Free/VIP/ELITE
- ✅ Match mútuo → abre chat

### Chat
- ✅ Global, Grupos, DMs (matches)
- ✅ Realtime via Supabase
- ✅ Unread counts + mark as read
- ✅ WebRTC calls (áudio/vídeo) + Screen Share

### Perfil
- ✅ Avatar/GIF/Banner customizados
- ✅ Bio, jogos, hobbies, intenções
- ✅ Dogtags (Classic/Neon/ELITE)
- ✅ Medalhas (8 base + custom admin)
- ✅ Destaques (3 slots)
- ✅ Mural de recados

### Monetização
- ✅ Free (5 likes/dia, 1 superlike/dia)
- ✅ VIP (R$19,90/mês) — likes ∞, superlikes ∞, salas privadas
- ✅ ELITE (R$34,90/mês) — tudo VIP + dogtags grátis, destaque
- ✅ CEO (owner) — painel admin total

### Admin (CEO only)
- ✅ Gerenciar usuários (ban/delete)
- ✅ Criar medalhas customizadas
- ✅ Bloquear tags/hashtags
- ✅ Ver estatísticas

## 🖥️ Electron Desktop

```bash
# Dev com hot reload
npm run electron:dev

# Build portable (~80MB)
npm run electron:build
# → dist/GamerConnections-2.0.0-Portable.exe
```

Recursos nativos:
- Single instance lock
- External links abrem no navegador
- IPC seguro via `contextBridge`
- Auto-updater ready (configure `electron-updater`)

## 📦 Deploy

### Netlify (Web)
1. Conecte repositório no Netlify
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Adicione env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
5. `_redirects` e `netlify.toml` já incluídos para SPA

### GitHub Actions (CI/CD)
- **PR**: Lint → TypeCheck → Test → Build → Deploy Preview
- **Push main**: Deploy Production + Release assets (Electron .exe)
- Secrets necessários: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`

## 🛠️ Scripts Úteis

```bash
npm run dev              # Vite dev server
npm run build            # TypeScript + Vite build
npm run preview          # Preview build local
npm run electron:dev     # Electron + Vite concurrent
npm run electron:build   # Build Electron (portable + NSIS)
npm run lint             # ESLint
npm run typecheck        # tsc --noEmit
```

## 📄 Licença

MIT — Livre para uso comercial e modificação.

---

**Desenvolvido com ❤️ para a comunidade gamer brasileira.**