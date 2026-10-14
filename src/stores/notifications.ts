import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Notification } from '@/types/ui'

interface NotificationsState {
  items: Notification[]
  unreadCount: number
  isPanelOpen: boolean
  
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void
  addNotificationFull: (notification: Notification) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  clearAll: () => void
  setPanelOpen: (open: boolean) => void
  setItems: (items: Notification[]) => void
  
  // Realtime
  onNotificationInsert: (notification: Notification) => void
}

function generateId() {
  return 'notif_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      items: [],
      unreadCount: 0,
      isPanelOpen: false,
      
      addNotification: (notification) => {
        const full: Notification = {
          ...notification,
          id: generateId(),
          read: false,
          createdAt: new Date().toISOString()
        }
        get().addNotificationFull(full)
      },
      
      addNotificationFull: (notification) => set((state) => {
        if (state.items.some(n => n.id === notification.id)) return state
        return {
          items: [notification, ...state.items].slice(0, 100),
          unreadCount: notification.read ? state.unreadCount : state.unreadCount + 1
        }
      }),
      
      markAsRead: (id) => set((state) => {
        const item = state.items.find(n => n.id === id)
        if (!item || item.read) return state
        return {
          items: state.items.map(n => n.id === id ? { ...n, read: true } : n),
          unreadCount: Math.max(0, state.unreadCount - 1)
        }
      }),
      
      markAllAsRead: () => set((state) => ({
        items: state.items.map(n => ({ ...n, read: true })),
        unreadCount: 0
      })),
      
      removeNotification: (id) => set((state) => {
        const item = state.items.find(n => n.id === id)
        return {
          items: state.items.filter(n => n.id !== id),
          unreadCount: item && !item.read ? state.unreadCount - 1 : state.unreadCount
        }
      }),
      
      clearAll: () => set({ items: [], unreadCount: 0 }),
      
      setPanelOpen: (open) => set({ isPanelOpen: open }),
      
      setItems: (items) => set({ 
        items, 
        unreadCount: items.filter(n => !n.read).length 
      }),
      
      onNotificationInsert: (notification) => get().addNotificationFull(notification)
    }),
    {
      name: 'gc_notifications_v2',
      partialize: (state) => ({
        items: state.items.slice(0, 50)
      })
    }
  )
)