import { useEffect, useState } from 'preact/hooks'
import { html } from 'htm/preact'
import { useUIStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import { useNotificationsStore } from '@/stores/notifications'
import { initAuth } from '@/hooks/useAuth'
import { subscribeToGlobalChat, subscribeToFeed, subscribeToNotifications, unsubscribeAll } from '@/services/realtime'

export function renderApp() {
  const [mounted, setMounted] = useState(false)
  const { activeTab, sidebarOpen, toasts, modals, setSidebarOpen, removeToast } = useUIStore()
  const { user, isAuthenticated, isLoading } = useAuthStore()
  const { channels, activeChannelId, unreadCount } = useChatStore()
  const { items: notifications, unreadCount: notifUnread, isPanelOpen, setPanelOpen } = useNotificationsStore()

  useEffect(() => {
    setMounted(true)
    initAuth()
  }, [])

  useEffect(() => {
    if (isAuthenticated && mounted) {
      subscribeToGlobalChat()
      subscribeToFeed()
      subscribeToNotifications()
    }
    return () => unsubscribeAll()
  }, [isAuthenticated, mounted])

  const totalUnread = Object.values(channels).reduce((sum, c) => sum + (c.unreadCount || 0), 0) + notifUnread

  if (!mounted || isLoading) {
    return html`
      <div class="page-skeleton">
        <div class="skeleton-card" style="height: 80px;"></div>
        <div class="skeleton-card" style="height: 200px;"></div>
        <div class="skeleton-card" style="height: 300px;"></div>
      </div>
    `
  }

  return html`
    <div class="app-shell">
      ${!isAuthenticated ? html`
        <div class="auth-pages" id="auth-pages"></div>
      ` : html`
        <!-- Sidebar Overlay for Mobile -->
        <div class="sidebar-overlay ${sidebarOpen ? 'open' : ''}" onClick=${() => setSidebarOpen(false)}></div>

        <!-- Sidebar Desktop -->
        <aside class="sidebar ${sidebarOpen ? 'open' : ''}" role="navigation" aria-label="Navegação principal">
          <a href="/" class="sidebar-logo" onClick=${(e) => { e.preventDefault(); useUIStore.getState().setActiveTab('discover'); window.history.pushState(null, '', '/discover'); }}>
            <img class="logo-img" src="/assets/logo.png" alt="GamerConnections">
            <span class="logo-text">GamerConnections</span>
          </a>

          <nav class="side-nav">
            <button class="side-btn ${activeTab === 'discover' ? 'active' : ''}" 
              onClick=${() => { useUIStore.getState().setActiveTab('discover'); window.history.pushState(null, '', '/discover'); }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
              </svg>
              Descobrir
            </button>

            <button class="side-btn ${activeTab === 'feed' ? 'active' : ''}"
              onClick=${() => { useUIStore.getState().setActiveTab('feed'); window.history.pushState(null, '', '/feed'); }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
              </svg>
              Feed
            </button>

            <button class="side-btn ${activeTab === 'clips' ? 'active' : ''}"
              onClick=${() => { useUIStore.getState().setActiveTab('clips'); window.history.pushState(null, '', '/clips'); }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
              </svg>
              Clips
            </button>

            <button class="side-btn ${activeTab === 'matches' ? 'active' : ''}"
              onClick=${() => { useUIStore.getState().setActiveTab('matches'); window.history.pushState(null, '', '/matches'); }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              Matches
              ${totalUnread > 0 ? html`<span class="notif-badge">${totalUnread > 99 ? '99+' : totalUnread}</span>` : ''}
            </button>

            <button class="side-btn ${activeTab === 'chat' ? 'active' : ''}"
              onClick=${() => { useUIStore.getState().setActiveTab('chat'); window.history.pushState(null, '', '/chat'); }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              Chat
              ${unreadCount > 0 ? html`<span class="notif-badge">${unreadCount > 99 ? '99+' : unreadCount}</span>` : ''}
            </button>

            <button class="side-btn ${activeTab === 'rooms' ? 'active' : ''}"
              onClick=${() => { useUIStore.getState().setActiveTab('rooms'); window.history.pushState(null, '', '/rooms'); }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Salas
            </button>

            <button class="side-btn ${activeTab === 'profile' ? 'active' : ''}"
              onClick=${() => { useUIStore.getState().setActiveTab('profile'); window.history.pushState(null, '', '/profile'); }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              Meu perfil
            </button>

            <span class="side-divider">Loja & VIP</span>
            <a href="/loja.html" class="side-btn" onClick=${(e) => { e.preventDefault(); useUIStore.getState().setActiveTab('shop'); window.history.pushState(null, '', '/shop'); }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              Loja
            </a>
            <a href="/planos.html" class="side-btn" onClick=${(e) => { e.preventDefault(); window.history.pushState(null, '', '/planos'); }}>
              <img src="/assets/icons/crown.png" alt="" width="22" height="22">
              Planos VIP
            </a>
          </nav>

          ${user && html`
            <div class="side-vip">
              <div><img src="/assets/icons/crown.png" alt="VIP" width="30" height="30"><strong>Modo ${user.plan?.toUpperCase() || 'FREE'}</strong></div>
              <div>Likes ∞ + salas privadas</div>
              <a href="/planos.html" class="btn btn-primary" style="margin-top: var(--space-sm); width: 100%;">Virar VIP</a>
            </div>
          `}

          <div class="side-user">
            <img id="sideAvatar" class="avatar" src=${user?.avatar || '/assets/avatars/avatar1.svg'} alt="Você">
            <div class="side-user-info">
              <strong id="sideName">${user?.name || 'Gamer'}</strong>
              <span id="sidePlan">Plano ${user?.plan?.toUpperCase() || 'FREE'}</span>
            </div>
            <button class="side-btn-notif" id="sideNotifBtn" aria-label="Notificações" onClick=${() => setPanelOpen(!isPanelOpen)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              ${notifUnread > 0 ? html`<span class="notif-badge">${notifUnread > 99 ? '99+' : notifUnread}</span>` : ''}
            </button>
            <button class="side-logout" data-logout aria-label="Sair da conta" onClick=${() => { useAuthStore.getState().logout(); window.history.pushState(null, '', '/login'); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </aside>

        <!-- Mobile Topbar -->
        <div class="mobile-topbar">
          <a href="/" class="logo" onClick=${(e) => { e.preventDefault(); useUIStore.getState().setActiveTab('discover'); window.history.pushState(null, '', '/discover'); }}>
            <img class="logo-img" src="/assets/logo.png" alt="GamerConnections">
            <span class="logo-text">GamerConnections</span>
          </a>
          <button class="mobile-notif-btn" id="mobileNotifBtn" aria-label="Notificações" onClick=${() => setPanelOpen(!isPanelOpen)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            ${notifUnread > 0 ? html`<span class="notif-badge">${notifUnread > 99 ? '99+' : notifUnread}</span>` : ''}
          </button>
          <img class="mobile-avatar" id="mobileAvatar" src=${user?.avatar || '/assets/avatars/avatar1.svg'} alt="Você">
        </div>

        <!-- Main Content -->
        <main class="app-main" id="app-main">
          <!-- Views will be rendered here by router -->
        </main>

        <!-- Notification Panel -->
        <div class="notif-backdrop ${isPanelOpen ? '' : 'hidden'}" onClick=${() => setPanelOpen(false)}></div>
        <aside class="notif-panel ${isPanelOpen ? 'open' : ''}" aria-hidden=${!isPanelOpen} role="dialog" aria-label="Notificações">
          <div class="notif-panel-header">
            <h3>Notificações</h3>
            <button class="notif-close" onClick=${() => setPanelOpen(false)}>✕</button>
          </div>
          <div class="notif-panel-body" id="notifList">
            ${notifications.length === 0 ? html`
              <div class="notif-empty">Nenhuma notificação ainda</div>
            ` : html`
              ${notifications.map(notif => html`
                <div class="notif-item ${!notif.read ? 'unread' : ''}" onClick=${() => { useNotificationsStore.getState().markAsRead(notif.id); handleNotifClick(notif); }}>
                  <img class="notif-avatar" src=${notif.actor.avatar || '/assets/avatars/avatar1.svg'} alt="">
                  <div class="notif-content">
                    <div class="notif-title">${notif.title}</div>
                    <div class="notif-body">${notif.body}</div>
                    <div class="notif-time">${formatRelativeTime(notif.createdAt)}</div>
                  </div>
                  ${!notif.read ? html`<div class="notif-dot"></div>` : ''}
                </div>
              `)}
            `}
          </div>
          <div class="notif-panel-footer">
            <button class="btn btn-secondary btn-full" onClick=${() => useNotificationsStore.getState().markAllAsRead()}>Marcar todas como lidas</button>
          </div>
        </aside>

        <!-- Toasts -->
        <div class="toast-container" id="toastContainer">
          ${toasts.map(toast => html`
            <div class="toast toast-${toast.type}" style="animation: slideIn 0.3s var(--ease-out);">
              <div class="toast-icon">
                ${toast.type === 'success' && html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`}
                ${toast.type === 'error' && html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`}
                ${toast.type === 'warning' && html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`}
                ${toast.type === 'info' && html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`}
              </div>
              <span class="toast-message">${toast.message}</span>
              <button class="toast-close" onClick=${() => removeToast(toast.id)}>✕</button>
            </div>
          `)}
        </div>
      `}
    </div>
  `
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
    if (diff < 60) return 'agora'
    if (diff < 3600) return `${Math.floor(diff/60)}min`
    if (diff < 86400) return `${Math.floor(diff/3600)}h`
    return `${Math.floor(diff/86400)}d`
  } catch {
    return 'agora'
  }
}

function handleNotifClick(notif: any) {
  switch (notif.targetType) {
    case 'post':
      window.history.pushState(null, '', `/feed?post=${notif.targetId}`)
      break
    case 'profile':
      window.history.pushState(null, '', `/profile/${notif.targetId}`)
      break
    case 'chat':
      window.history.pushState(null, '', `/chat/${notif.targetId}`)
      break
    case 'match':
      window.history.pushState(null, '', `/matches?match=${notif.targetId}`)
      break
  }
  useNotificationsStore.getState().setPanelOpen(false)
}