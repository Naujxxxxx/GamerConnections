import { useUIStore } from './stores/ui'
import { useAuthStore } from './stores/auth'

type RouteHandler = (params: Record<string, string>) => Promise<void> | void

interface Route {
  path: string
  handler: RouteHandler
  requiresAuth?: boolean
  requiresPlan?: ('vip' | 'elite' | 'ceo')[]
}

export class Router {
  private routes: Route[] = []
  private currentRoute: Route | null = null
  private basePath = ''

  constructor(basePath = '') {
    this.basePath = basePath
    window.addEventListener('popstate', () => this.handleRoute())
  }

  addRoute(path: string, handler: RouteHandler, options: { requiresAuth?: boolean; requiresPlan?: ('vip' | 'elite' | 'ceo')[] } = {}) {
    this.routes.push({ path, handler, ...options })
    return this
  }

  start() {
    this.handleRoute()
  }

  navigate(path: string, replace = false) {
    const url = this.basePath + path
    if (replace) {
      history.replaceState(null, '', url)
    } else {
      history.pushState(null, '', url)
    }
    this.handleRoute()
  }

  private async handleRoute() {
    const path = window.location.pathname.replace(this.basePath, '') || '/'
    
    // Find matching route
    const route = this.routes.find(r => this.matchPath(r.path, path))
    if (!route) {
      this.navigate('/404', true)
      return
    }

    // Check auth
    if (route.requiresAuth && !useAuthStore.getState().isAuthenticated) {
      this.navigate('/login', true)
      return
    }

    // Check plan
    if (route.requiresPlan) {
      const userPlan = useAuthStore.getState().plan
      if (!route.requiresPlan.includes(userPlan)) {
        this.navigate('/planos', true)
        useUIStore.getState().addToast({
          type: 'error',
          message: 'Esta funcionalidade requer plano VIP ou superior',
          duration: 5000
        })
        return
      }
    }

    // Extract params
    const params = this.extractParams(route.path, path)

    // Update UI state
    useUIStore.getState().setActiveTab(this.pathToTab(path))

    // Call handler
    this.currentRoute = route
    try {
      await route.handler(params)
    } catch (error) {
      console.error('Route handler error:', error)
    }
  }

  private matchPath(routePath: string, currentPath: string): boolean {
    const routeRegex = routePath
      .replace(/\/:([^/]+)/g, '/([^/]+)')
      .replace(/\*/g, '.*')
    return new RegExp(`^${routeRegex}$`).test(currentPath)
  }

  private extractParams(routePath: string, currentPath: string): Record<string, string> {
    const paramNames = (routePath.match(/\/:[^/]+/g) || []).map(p => p.slice(2))
    const values = currentPath.split('/').slice(1)
    const routeParts = routePath.split('/').slice(1)
    
    const params: Record<string, string> = {}
    routeParts.forEach((part, i) => {
      if (part.startsWith(':')) {
        params[part.slice(1)] = values[i] || ''
      }
    })
    return params
  }

  private pathToTab(path: string): string {
    if (path.startsWith('/discover') || path === '/') return 'discover'
    if (path.startsWith('/feed')) return 'feed'
    if (path.startsWith('/matches')) return 'matches'
    if (path.startsWith('/chat')) return 'chat'
    if (path.startsWith('/rooms')) return 'rooms'
    if (path.startsWith('/profile')) return 'profile'
    if (path.startsWith('/shop')) return 'shop'
    if (path.startsWith('/admin')) return 'admin'
    return 'discover'
  }

  destroy() {
    window.removeEventListener('popstate', () => this.handleRoute())
    this.routes = []
  }
}

// Default routes
export function createDefaultRoutes() {
  return new Router()
    .addRoute('/', () => import('./components/Discover').then(m => m.renderDiscover()))
    .addRoute('/discover', () => import('./components/Discover').then(m => m.renderDiscover()))
    .addRoute('/feed', () => import('./components/Feed').then(m => m.renderFeed()))
    .addRoute('/matches', () => import('./components/Matches').then(m => m.renderMatches()))
    .addRoute('/chat', () => import('./components/Chat').then(m => m.renderChat()))
    .addRoute('/chat/:channelId', ({ channelId }) => import('./components/Chat').then(m => m.renderChat(channelId)))
    .addRoute('/rooms', () => import('./components/Rooms').then(m => m.renderRooms()))
    .addRoute('/profile', () => import('./components/Profile').then(m => m.renderProfile()))
    .addRoute('/profile/:username', ({ username }) => import('./components/Profile').then(m => m.renderProfile(username)))
    .addRoute('/shop', () => import('./components/Shop').then(m => m.renderShop()))
    .addRoute('/admin', () => import('./components/Admin').then(m => m.renderAdmin()), { requiresAuth: true, requiresPlan: ['ceo'] })
    .addRoute('/login', () => import('./components/Auth').then(m => m.renderLogin()))
    .addRoute('/register', () => import('./components/Auth').then(m => m.renderRegister()))
    .addRoute('/planos', () => import('./components/Plans').then(m => m.renderPlans()))
    .addRoute('/404', () => import('./components/NotFound').then(m => m.renderNotFound()))
}