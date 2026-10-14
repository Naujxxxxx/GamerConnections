import { useEffect, useState, useCallback } from 'preact/hooks'
import { html } from 'htm/preact'
import { useMatchesStore } from '@/stores/matches'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { fetchDiscoverProfiles, toggleLike, sendRequest } from '@/services/supabase'
import { calculateAge } from '@/utils/date'

export function renderDiscover() {
  const { deck, likesLeft, canLike, canSuperlike, isLoading, addToSeen, incrementLike, incrementSuperlike, setDeck, setLoading } = useMatchesStore()
  const { user, plan, isVip, isElite } = useAuthStore()
  const { addToast } = useUIStore()
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (deck.length === 0 && !isLoading) {
      loadProfiles()
    }
  }, [])

  const loadProfiles = async () => {
    setLoading(true)
    try {
      const seen = useMatchesStore.getState().seen
      const profiles = await fetchDiscoverProfiles(seen)
      setDeck(profiles)
    } catch (error) {
      console.error('Failed to load profiles:', error)
      addToast({ type: 'error', message: 'Erro ao carregar perfis' })
    } finally {
      setLoading(false)
    }
  }

  const handleLike = useCallback(async (profileId: string) => {
    if (!canLike()) {
      addToast({ type: 'error', message: 'Likes esgotados. Seja VIP para likes ilimitados!' })
      return
    }

    try {
      if (profileId.startsWith('u:')) {
        const username = profileId.slice(2)
        await sendRequest(username)
        addToast({ type: 'success', message: 'Solicitação enviada!' })
      }
      incrementLike()
      addToSeen(profileId)
    } catch (error) {
      console.error('Like failed:', error)
      addToast({ type: 'error', message: 'Erro ao curtir' })
    }
  }, [canLike, incrementLike, addToSeen, addToast])

  const handlePass = useCallback((profileId: string) => {
    addToSeen(profileId)
  }, [addToSeen])

  const handleSuperlike = useCallback(async (profileId: string) => {
    if (!canSuperlike(isVip, isElite)) {
      addToast({ type: 'error', message: 'Superlikes esgotados. ELITE tem ilimitados!' })
      return
    }

    try {
      if (profileId.startsWith('u:')) {
        const username = profileId.slice(2)
        await sendRequest(username)
        addToast({ type: 'success', message: 'Superlike enviado!' })
      }
      incrementSuperlike()
      addToSeen(profileId)
    } catch (error) {
      console.error('Superlike failed:', error)
      addToast({ type: 'error', message: 'Erro ao superlikear' })
    }
  }, [canSuperlike, isVip, isElite, incrementSuperlike, addToSeen, addToast])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const profiles = await fetchDiscoverProfiles([])
      setDeck(profiles)
      addToast({ type: 'success', message: 'Perfis atualizados!' })
    } catch (error) {
      addToast({ type: 'error', message: 'Erro ao atualizar' })
    } finally {
      setIsRefreshing(false)
    }
  }, [setDeck, addToast])

  const currentProfile = deck[0]

  if (deck.length === 0 && !isLoading) {
    return html`
      <div class="app-view active">
        <div class="app-greet">
          <div>
            <p class="hello">Boa noite, ${user?.name?.split(' ')[0] || 'Gamer'}</p>
            <h2>Encontre sua <span class="gradient-text">squad</span> hoje</h2>
          </div>
        </div>
        <div class="likes-bar">
          <span id="likesInfo">${likesLeft() === Infinity ? 'Likes ilimitados (VIP ativo)' : `${likesLeft()} like${likesLeft() === 1 ? '' : 's'} restante${likesLeft() === 1 ? '' : 's'} hoje`}</span>
          <a href="/planos.html" id="likesUpsell" hidden>Virar VIP = likes ilimitados</a>
        </div>
        <div class="deck-wrap">
          <div class="deck-empty" id="deckEmpty">
            <img src="/assets/logo.png" alt="" width="72" height="72">
            <h3>Você viu todo mundo por hoje</h3>
            <p>Volte amanhã para novos jogadores — ou vire VIP para descobrir sem limites.</p>
            <a href="/planos.html" class="btn btn-primary">Ver planos VIP</a>
          </div>
        </div>
        <div class="deck-actions" id="deckActions">
          <button class="deck-btn refresh" id="refreshDeckBtn" onClick=${handleRefresh} disabled=${isRefreshing} aria-label="Atualizar jogadores">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </button>
        </div>
      </div>
    `
  }

  return html`
    <div class="app-view active">
      <div class="app-greet">
        <div>
          <p class="hello">Boa noite, ${user?.name?.split(' ')[0] || 'Gamer'}</p>
          <h2>Encontre sua <span class="gradient-text">squad</span> hoje</h2>
        </div>
      </div>
      <div class="likes-bar">
        <span id="likesInfo">${likesLeft() === Infinity ? 'Likes ilimitados (VIP ativo)' : `${likesLeft()} like${likesLeft() === 1 ? '' : 's'} restante${likesLeft() === 1 ? '' : 's'} hoje`}</span>
        <a href="/planos.html" id="likesUpsell" hidden>Virar VIP = likes ilimitados</a>
      </div>
      <div class="deck-wrap">
        <div class="deck" id="deck">
          ${currentProfile ? html`
            <article class="swipe-card" data-id=${currentProfile.id}>
              <div class="swipe-photo">
                <span class="swipe-level">${currentProfile.level || 'Lv 1'}</span>
                <img src=${currentProfile.avatar} alt=${currentProfile.name}>
              </div>
              <div class="swipe-info">
                <h3>${currentProfile.name} <span>${currentProfile.age || '?'}</span></h3>
                <p class="swipe-rank">${currentProfile.rank || 'Sem rank'}</p>
                <div class="swipe-games">${currentProfile.games?.map(g => html`<span>${g}</span>`).join('') || ''}</div>
                <div class="swipe-games intents">${currentProfile.intents?.map(t => html`<span class="intent">${t}</span>`).join('') || ''}</div>
                <p class="swipe-bio">${currentProfile.bio || 'Sem bio'}</p>
              </div>
            </article>
          ` : ''}
        </div>
        <div class="deck-empty" id="deckEmpty" hidden>
          <img src="/assets/logo.png" alt="" width="72" height="72">
          <h3>Você viu todo mundo por hoje</h3>
          <p>Volte amanhã para novos jogadores — ou vire VIP para descobrir sem limites.</p>
          <a href="/planos.html" class="btn btn-primary">Ver planos VIP</a>
        </div>
      </div>
      <div class="deck-actions" id="deckActions">
        <button class="deck-btn pass" id="passBtn" onClick=${() => currentProfile && handlePass(currentProfile.id)} aria-label="Pular perfil">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <button class="deck-btn refresh" id="refreshDeckBtn" onClick=${handleRefresh} disabled=${isRefreshing} aria-label="Atualizar jogadores" title="Buscar novos jogadores">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
        </button>
        <button class="deck-btn like" id="likeBtn" onClick=${() => currentProfile && handleLike(currentProfile.id)} aria-label="Curtir perfil">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>
    </div>
  `
}