import { supabase } from './config/supabase'
import { subscribeToGlobalChat, subscribeToFeed, subscribeToNotifications, unsubscribeAll } from './services/realtime'
import { useAuthStore } from './stores/auth'
import { useUIStore } from './stores/ui'
import { useFeedStore } from './stores/feed'
import { useChatStore } from './stores/chat'
import { useMatchesStore } from './stores/matches'
import { useNotificationsStore } from './stores/notifications'
import { Router } from './router'
import { renderApp } from './components/App'

export function createApp() {
  let router: Router
  let isInitialized = false

  async function init() {
    if (isInitialized) return
    isInitialized = true

    // Initialize Supabase auth listener
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Fetch user profile
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          if (profile) {
            useAuthStore.getState().setAuth(profile as any, session)
            initRealtime()
          }
        } catch (error) {
          console.error('Failed to fetch profile:', error)
        }
      } else if (event === 'SIGNED_OUT') {
        useAuthStore.getState().logout()
        unsubscribeAll()
      }
    })

    // Check existing session
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      
      if (profile) {
        useAuthStore.getState().setAuth(profile as any, session)
        initRealtime()
      }
    }

    // Initialize router
    router = new Router()
    router.start()

    // Render app shell
    renderApp()

    // Load initial data
    await loadInitialData()
  }

  function initRealtime() {
    subscribeToGlobalChat()
    subscribeToFeed()
    subscribeToNotifications()
  }

  async function loadInitialData() {
    const { fetchFeed } = await import('./services/supabase')
    const { fetchChannels } = await import('./services/supabase')
    const { fetchDiscoverProfiles } = await import('./services/supabase')

    try {
      // Load feed
      const { posts } = await fetchFeed()
      useFeedStore.getState().setPosts(posts)

      // Load chat channels
      const channels = await fetchChannels()
      channels.forEach(c => useChatStore.getState().addChannel(c))

      // Load discover profiles
      const profiles = await fetchDiscoverProfiles()
      useMatchesStore.getState().setDeck(profiles)

    } catch (error) {
      console.error('Failed to load initial data:', error)
    }
  }

  function destroy() {
    unsubscribeAll()
    router?.destroy()
    isInitialized = false
  }

  return {
    init,
    destroy,
    getRouter: () => router
  }
}

// Auto-init when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => createApp().init())
} else {
  createApp().init()
}