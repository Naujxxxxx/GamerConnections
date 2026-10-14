import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChatMessage, Group } from '@/types/database'
import type { ChatChannel } from '@/types/ui'

interface ChatState {
  channels: Record<string, ChatChannel>
  messages: Record<string, ChatMessage[]>
  activeChannelId: string | null
  isLoading: Record<string, boolean>
  hasMore: Record<string, boolean>
  cursors: Record<string, string | null>
  
  setActiveChannel: (channelId: string | null) => void
  addChannel: (channel: ChatChannel) => void
  updateChannel: (channelId: string, partial: Partial<ChatChannel>) => void
  removeChannel: (channelId: string) => void
  
  setMessages: (channelId: string, messages: ChatMessage[]) => void
  prependMessages: (channelId: string, messages: ChatMessage[]) => void
  addMessage: (channelId: string, message: ChatMessage) => void
  setLoading: (channelId: string, loading: boolean) => void
  setHasMore: (channelId: string, hasMore: boolean) => void
  setCursor: (channelId: string, cursor: string | null) => void
  
  markAsRead: (channelId: string) => void
  incrementUnread: (channelId: string) => void
  
  // Realtime
  onMessageInsert: (message: ChatMessage) => void
  onMessageUpdate: (message: ChatMessage) => void
  onMessageDelete: (channelId: string, messageId: string) => void
  onChannelUpdate: (channel: ChatChannel) => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      channels: {},
      messages: {},
      activeChannelId: null,
      isLoading: {},
      hasMore: {},
      cursors: {},
      
      setActiveChannel: (channelId) => set({ activeChannelId: channelId }),
      
      addChannel: (channel) => set((state) => ({
        channels: { ...state.channels, [channel.id]: channel }
      })),
      
      updateChannel: (channelId, partial) => set((state) => ({
        channels: { ...state.channels, [channelId]: { ...state.channels[channelId], ...partial } }
      })),
      
      removeChannel: (channelId) => set((state) => {
        const { [channelId]: _, ...rest } = state.channels
        const { [channelId]: __, ...messagesRest } = state.messages
        return { channels: rest, messages: messagesRest }
      }),
      
      setMessages: (channelId, messages) => set((state) => ({
        messages: { ...state.messages, [channelId]: messages }
      })),
      
      prependMessages: (channelId, messages) => set((state) => ({
        messages: { 
          ...state.messages, 
          [channelId]: [...messages, ...(state.messages[channelId] || [])] 
        }
      })),
      
      addMessage: (channelId, message) => set((state) => {
        const existing = state.messages[channelId] || []
        if (existing.some(m => m.id === message.id)) return state
        return {
          messages: { ...state.messages, [channelId]: [...existing, message] },
          channels: {
            ...state.channels,
            [channelId]: {
              ...state.channels[channelId],
              lastMessage: message,
              unreadCount: state.activeChannelId === channelId ? 0 : (state.channels[channelId]?.unreadCount || 0) + 1
            }
          }
        }
      }),
      
      setLoading: (channelId, loading) => set((state) => ({
        isLoading: { ...state.isLoading, [channelId]: loading }
      })),
      
      setHasMore: (channelId, hasMore) => set((state) => ({
        hasMore: { ...state.hasMore, [channelId]: hasMore }
      })),
      
      setCursor: (channelId, cursor) => set((state) => ({
        cursors: { ...state.cursors, [channelId]: cursor }
      })),
      
      markAsRead: (channelId) => set((state) => ({
        channels: {
          ...state.channels,
          [channelId]: { ...state.channels[channelId], unreadCount: 0 }
        }
      })),
      
      incrementUnread: (channelId) => set((state) => ({
        channels: {
          ...state.channels,
          [channelId]: { 
            ...state.channels[channelId], 
            unreadCount: (state.channels[channelId]?.unreadCount || 0) + 1 
          }
        }
      })),
      
      // Realtime
      onMessageInsert: (message) => {
        const channelId = message.scope === 'global' ? 'global' : `${message.scope}:${message.scope_id}`
        get().addMessage(channelId, message)
        if (get().activeChannelId !== channelId) {
          get().incrementUnread(channelId)
        }
      },
      
      onMessageUpdate: (message) => {
        const channelId = message.scope === 'global' ? 'global' : `${message.scope}:${message.scope_id}`
        set((state) => ({
          messages: {
            ...state.messages,
            [channelId]: (state.messages[channelId] || []).map(m => m.id === message.id ? message : m)
          }
        }))
      },
      
      onMessageDelete: (channelId, messageId) => set((state) => ({
        messages: {
          ...state.messages,
          [channelId]: (state.messages[channelId] || []).filter(m => m.id !== messageId)
        }
      })),
      
      onChannelUpdate: (channel) => get().updateChannel(channel.id, channel)
    }),
    {
      name: 'gc_chat_v2',
      partialize: (state) => ({
        channels: state.channels,
        activeChannelId: state.activeChannelId
      })
    }
  )
)