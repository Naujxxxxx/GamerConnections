import { create } from 'zustand'
import type { ModalState, Toast } from '@/types/ui'

interface UIState {
  // Modals
  modals: Record<string, ModalState>
  openModal: (type: string, data?: unknown) => void
  closeModal: (type: string) => void
  closeAllModals: () => void
  
  // Toasts
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  
  // Sidebar
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  
  // Active tab
  activeTab: string
  setActiveTab: (tab: string) => void
  
  // Search
  searchQuery: string
  searchResults: unknown[]
  isSearching: boolean
  setSearchQuery: (query: string) => void
  setSearchResults: (results: unknown[]) => void
  setSearching: (searching: boolean) => void
  
  // Loading states
  globalLoading: boolean
  setGlobalLoading: (loading: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  modals: {},
  openModal: (type, data) => set((state) => ({
    modals: { ...state.modals, [type]: { isOpen: true, type, data } }
  })),
  closeModal: (type) => set((state) => {
    const { [type]: _, ...rest } = state.modals
    return { modals: rest }
  }),
  closeAllModals: () => set({ modals: {} }),
  
  toasts: [],
  addToast: (toast) => set((state) => ({
    toasts: [...state.toasts, { ...toast, id: 'toast_' + Date.now() }]
  })),
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter(t => t.id !== id)
  })),
  
  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  
  activeTab: 'discover',
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  searchQuery: '',
  searchResults: [],
  isSearching: false,
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchResults: (results) => set({ searchResults: results }),
  setSearching: (searching) => set({ isSearching: searching }),
  
  globalLoading: false,
  setGlobalLoading: (loading) => set({ globalLoading: loading })
}))