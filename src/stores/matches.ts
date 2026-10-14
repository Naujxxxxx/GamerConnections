import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MatchProfile } from '@/types/ui'

interface MatchesState {
  deck: MatchProfile[]
  matches: MatchProfile[]
  seen: string[]
  likesToday: { date: string; count: number }
  superlikesToday: { date: string; count: number }
  isLoading: boolean
  
  setDeck: (profiles: MatchProfile[]) => void
  addToSeen: (profileId: string) => void
  addMatch: (profile: MatchProfile) => void
  removeMatch: (profileId: string) => void
  incrementLike: () => void
  incrementSuperlike: () => void
  resetDailyCounts: () => void
  setLoading: (loading: boolean) => void
  
  // Computed
  likesLeft: () => number
  superlikesLeft: () => number
  canLike: () => boolean
  canSuperlike: (isVip: boolean, isElite: boolean) => boolean
}

const TODAY = () => new Date().toISOString().split('T')[0]

export const useMatchesStore = create<MatchesState>()(
  persist(
    (set, get) => ({
      deck: [],
      matches: [],
      seen: [],
      likesToday: { date: TODAY(), count: 0 },
      superlikesToday: { date: TODAY(), count: 0 },
      isLoading: false,
      
      setDeck: (profiles) => set({ deck: profiles }),
      
      addToSeen: (profileId) => set((state) => ({
        seen: [...state.seen, profileId],
        deck: state.deck.filter(p => p.id !== profileId)
      })),
      
      addMatch: (profile) => set((state) => ({
        matches: [...state.matches, profile],
        deck: state.deck.filter(p => p.id !== profile.id)
      })),
      
      removeMatch: (profileId) => set((state) => ({
        matches: state.matches.filter(m => m.id !== profileId)
      })),
      
      incrementLike: () => set((state) => {
        const today = TODAY()
        if (state.likesToday.date !== today) {
          return { likesToday: { date: today, count: 1 } }
        }
        return { likesToday: { ...state.likesToday, count: state.likesToday.count + 1 } }
      }),
      
      incrementSuperlike: () => set((state) => {
        const today = TODAY()
        if (state.superlikesToday.date !== today) {
          return { superlikesToday: { date: today, count: 1 } }
        }
        return { superlikesToday: { ...state.superlikesToday, count: state.superlikesToday.count + 1 } }
      }),
      
      resetDailyCounts: () => set({
        likesToday: { date: TODAY(), count: 0 },
        superlikesToday: { date: TODAY(), count: 0 }
      }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      likesLeft: () => {
        const { likesToday, plan } = useAuthStore.getState()
        if (['vip', 'elite', 'ceo'].includes(plan)) return Infinity
        const today = TODAY()
        if (likesToday.date !== today) return 5
        return Math.max(0, 5 - likesToday.count)
      },
      
      superlikesLeft: () => {
        const { superlikesToday, plan } = useAuthStore.getState()
        if (['elite', 'ceo'].includes(plan)) return Infinity
        if (plan === 'vip') return 5
        const today = TODAY()
        if (superlikesToday.date !== today) return 1
        return Math.max(0, 1 - superlikesToday.count)
      },
      
      canLike: () => get().likesLeft() > 0,
      
      canSuperlike: (isVip, isElite) => {
        if (isElite) return true
        if (isVip) return get().superlikesLeft() > 0
        return get().superlikesLeft() > 0
      }
    }),
    {
      name: 'gc_matches_v2',
      partialize: (state) => ({
        seen: state.seen.slice(-200),
        matches: state.matches,
        likesToday: state.likesToday,
        superlikesToday: state.superlikesToday
      })
    }
  )
)