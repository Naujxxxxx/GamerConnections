import { useEffect, useState } from 'preact/hooks'
import { html } from 'htm/preact'
import { useChatStore } from '@/stores/chat'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { fetchChannels, sendMessage } from '@/services/supabase'
import { subscribeToGlobalChat, subscribeToGroupChat, subscribeToDM } from '@/services/realtime'
import { formatRelativeTime } from '@/utils/date'

export function renderChat(initialChannelId?: string) {
  const { channels, messages, activeChannelId, setActiveChannel, addChannel, addMessage, markAsRead, incrementUnread, onMessageInsert } = useChatStore()
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const [messageText, setMessageText] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (channels.size === 0) {
      loadChannels()
    }
    if (initialChannelId) {
      setActiveChannel(initialChannelId)
    }
  }, [])

  useEffect(() => {
    if (activeChannelId) {
      markAsRead(activeChannelId)
      subscribeToChannel(activeChannelId)
    }
    return () => {
      if (activeChannelId) {
        // unsubscribe handled by realtime service
      }
    }
  }, [activeChannelId])

  const loadChannels = async () => {
    try {
      const chans = await fetchChannels()
      chans.forEach(c => addChannel(c))
      if (chans.length && !activeChannelId) {
        setActiveChannel(chans[0].id)
      }
    } catch (error) {
      console.error('Failed to load channels:', error)
    }
  }

  const subscribeToChannel = (channelId: string) => {
    if (channelId === 'global') {
      subscribeToGlobalChat()
    } else if (channelId.startsWith('group:')) {
      subscribeToGroupChat(channelId.slice(6))
    } else if (channelId.startsWith('dm:')) {
      subscribeToDM(channelId.slice(3))
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageText.trim() || !activeChannelId) return

    const channelId = activeChannelId
    const text = messageText
    setMessageText('')

    try {
      await sendMessage(channelId, text)
    } catch (error) {
      console.error('Send message failed:', error)
      addToast({ type: 'error', message: 'Erro ao enviar' })
      setMessageText(text)
    }
  }

  const channel = activeChannelId ? channels[activeChannelId] : null
  const channelMessages = activeChannelId ? messages[activeChannelId] || [] : []

  return html`
    <div class="app-view active">
      <div class="chat-layout">
        <!-- Sidebar -->
        <aside class="chat-sidebar">
          <div class="chat-search">
            <div class="search-box">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input type="text" placeholder="Buscar conversas..." autocomplete="off">
            </div>
          </div>
          <div class="chat-channels">
            ${Object.values(channels).map(c => html`
              <button 
                class="chat-channel ${activeChannelId === c.id ? 'active' : ''}"
                onClick=${() => setActiveChannel(c.id)}
              >
                <img class="channel-avatar" src=${c.avatar || '/assets/avatars/avatar1.svg'} alt=${c.name}>
                <div class="channel-info">
                  <div class="channel-name">${c.name}</div>
                  <div class="channel-preview">${c.lastMessage?.text ? (c.lastMessage.username === user?.username ? 'Você: ' : '') + c.lastMessage.text.slice(0, 50) : 'Sem mensagens'}</div>
                </div>
                ${c.unreadCount > 0 ? html`<span class="channel-unread">${c.unreadCount > 99 ? '99+' : c.unreadCount}</span>` : ''}
              </button>
            `)}
          </div>
        </aside>

        <!-- Main Chat -->
        <div class="chat-main">
          ${channel ? html`
            <header class="chat-header">
              <img class="avatar" src=${channel.avatar || '/assets/avatars/avatar1.svg'} alt=${channel.name}>
              <div>
                <div class="channel-name" style="font-size: var(--text-base);">${channel.name}</div>
                <div style="font-size: var(--text-xs); color: var(--text-muted);">${channel.type === 'global' ? 'Chat público' : channel.type === 'group' ? 'Grupo' : 'Conversa direta'}</div>
              </div>
            </header>
            <div class="chat-messages" id="chatMessages">
              ${channelMessages.length === 0 ? html`
                <div class="empty-state" style="flex: 1;">
                  <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                  </svg>
                  <h3 class="empty-state-title">${channel.type === 'global' ? 'Bem-vindo ao chat global!' : 'Inicie a conversa'}</h3>
                  <p class="empty-state-text">${channel.type === 'global' ? 'Apresente-se e encontre sua squad.' : 'Envie a primeira mensagem.'}</p>
                </div>
              ` : channelMessages.map(msg => html`
                <div class="message ${msg.username === user?.username ? 'own' : ''}">
                  <img class="message-avatar" src=${msg.username === user?.username ? user?.avatar : '/assets/avatars/avatar1.svg'} alt=${msg.username}>
                  <div class="message-content">
                    <div class="message-header">
                      <span class="message-author">${msg.username === user?.username ? 'Você' : msg.username}</span>
                      <span class="message-time">${formatRelativeTime(msg.created_at)}</span>
                    </div>
                    <div class="message-text">${msg.text}</div>
                  </div>
                </div>
              `)}
            </div>
            <form class="chat-input" onSubmit=${handleSendMessage}>
              <input 
                type="text" 
                value=${messageText}
                onInput=${(e: any) => setMessageText(e.target.value)}
                placeholder=${channel.type === 'global' ? 'Diga algo para a comunidade...' : 'Digite sua mensagem...'}
                maxlength="2000"
                autocomplete="off"
              >
              <button type="submit" class="btn btn-primary" disabled=${!messageText.trim()}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </form>
          ` : html`
            <div class="empty-state" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;">
              <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <h3 class="empty-state-title">Selecione uma conversa</h3>
              <p class="empty-state-text">Escolha um chat na lateral ou inicie uma nova conversa</p>
            </div>
          `}
        </div>
      </div>
    </div>
  `
}