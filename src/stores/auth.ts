import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Profile, Subscription } from '@/types/database'
import type { Session } from '@supabase/supabase-js'

interface UserProfile extends Profile {
  age?: number
  rank?: string
  level?: string
}

interface AuthState {
  user: UserProfile | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  plan: 'free' | 'vip' | 'elite' | 'ceo'
  
  setAuth: (user: UserProfile | null, session: Session | null) => void
  updateProfile: (partial: Partial<UserProfile>) => void
  setPlan: (plan: 'free' | 'vip' | 'elite' | 'ceo', label?: string) => void
  logout: () => void
  setLoading: (loading: boolean) => void
  
  // Computed
  isVip: () => boolean
  isElite: () => boolean
  isOwner: () => boolean
  badgeColor: () => string | null
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isLoading: true,
      isAuthenticated: false,
      plan: 'free',
      
      setAuth: (user, session) => {
        const plan = user ? (user as any).plan || 'free' : 'free'
        set({ 
          user, 
          session, 
          isLoading: false, 
          isAuthenticated: !!user,
          plan 
        })
      },
      
      updateProfile: (partial) => set((state) => ({
        user: state.user ? { ...state.user, ...partial } : null
      })),
      
      setPlan: (plan, label) => set((state) => ({
        plan,
        user: state.user ? { ...state.user, plan, planLabel: label } : null
      })),
      
      logout: () => set({ 
        user: null, 
        session: null, 
        isAuthenticated: false, 
        plan: 'free' 
      }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      isVip: () => ['vip', 'elite', 'ceo'].includes(get().plan),
      isElite: () => ['elite', 'ceo'].includes(get().plan),
      isOwner: () => ['ceo'].includes(get().plan),
      badgeColor: () => get().user?.badge_color || null
    }),
    {
      name: 'gc_auth_v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        plan: state.plan
      })
    }
  )
)