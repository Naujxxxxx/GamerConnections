import './styles/main.css'
import { createApp } from './app'
import { initAuth } from './hooks/useAuth'

// Initialize auth on startup
initAuth()

// Create and mount app
const app = createApp()
app.mount('#app')

// Handle hot module replacement
if (import.meta.hot) {
  import.meta.hot.accept('./app', () => {
    // App will be re-mounted by Vite
  })
}

// Global error handler
window.addEventListener('error', (event) => {
  console.error('[Global Error]', event.error)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Rejection]', event.reason)
})

// Export for debugging
declare global {
  interface Window {
    __APP__: ReturnType<typeof createApp>
  }
}
window.__APP__ = app