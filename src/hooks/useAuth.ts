import { supabase } from '@/config/supabase'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { signIn, signUp, signOut, updateProfile, getProfile } from '@/services/supabase'

export async function initAuth() {
  useAuthStore.getState().setLoading(true)
  
  // Check for existing session
  const { data: { session } } = await supabase.auth.getSession()
  
  if (session) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      
      if (profile) {
        useAuthStore.getState().setAuth(profile as any, session)
      }
    } catch (error) {
      console.error('Failed to restore session:', error)
      await supabase.auth.signOut()
    }
  }
  
  useAuthStore.getState().setLoading(false)
}

export function useAuth() {
  const { user, session, isLoading, isAuthenticated, plan, isVip, isElite, isOwner, badgeColor, setAuth, logout, updateProfile: updateProfileStore, setPlan } = useAuthStore()
  
  const login = async (identifier: string, password: string) => {
    useUIStore.getState().setGlobalLoading(true)
    try {
      const { user: profile, session } = await signIn(identifier, password)
      setAuth(profile, session)
      useUIStore.getState().addToast({ type: 'success', message: `Bem-vindo, ${profile.name}!` })
      return { success: true }
    } catch (error: any) {
      useUIStore.getState().addToast({ type: 'error', message: error.message || 'Erro ao entrar' })
      return { success: false, error: error.message }
    } finally {
      useUIStore.getState().setGlobalLoading(false)
    }
  }

  const register = async (data: {
    username: string
    email: string
    password: string
    name: string
    birthdate: string
    gender: 'M' | 'F'
    lookingFor: 'M' | 'F' | 'both'
    intents: string[]
    avatar?: string
  }) => {
    useUIStore.getState().setGlobalLoading(true)
    try {
      const { user: profile, session } = await signUp(data)
      setAuth(profile, session)
      useUIStore.getState().addToast({ type: 'success', message: `Conta criada! Bem-vindo, ${profile.name}!` })
      return { success: true }
    } catch (error: any) {
      useUIStore.getState().addToast({ type: 'error', message: error.message || 'Erro ao cadastrar' })
      return { success: false, error: error.message }
    } finally {
      useUIStore.getState().setGlobalLoading(false)
    }
  }

  const logoutUser = async () => {
    await signOut()
    useUIStore.getState().addToast({ type: 'info', message: 'Você saiu da conta' })
  }

  const updateUserProfile = async (updates: Parameters<typeof updateProfile>[0]) => {
    useUIStore.getState().setGlobalLoading(true)
    try {
      const updated = await updateProfile(updates)
      updateProfileStore(updated)
      useUIStore.getState().addToast({ type: 'success', message: 'Perfil atualizado!' })
      return { success: true }
    } catch (error: any) {
      useUIStore.getState().addToast({ type: 'error', message: error.message || 'Erro ao atualizar' })
      return { success: false, error: error.message }
    } finally {
      useUIStore.getState().setGlobalLoading(false)
    }
  }

  const upgradePlan = async (newPlan: 'vip' | 'elite' | 'ceo') => {
    // In production, this would integrate with Stripe/Payment
    setPlan(newPlan)
    useUIStore.getState().addToast({ type: 'success', message: `Plano ${newPlan.toUpperCase()} ativado!` })
  }

  return {
    user,
    session,
    isLoading,
    isAuthenticated,
    plan,
    isVip,
    isElite,
    isOwner,
    badgeColor,
    login,
    register,
    logout: logoutUser,
    updateProfile: updateUserProfile,
    upgradePlan
  }
}