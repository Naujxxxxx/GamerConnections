import { useEffect, useState, useCallback } from 'preact/hooks'
import { html } from 'htm/preact'
import { useMatchesStore } from '@/stores/matches'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { fetchDiscoverProfiles, toggleLike, sendRequest } from '@/services/supabase'

export function renderMatches() {
  const { 
    deck, matches, seen, likesLeft, canLike, canSuperlike, superlikesLeft, 
    isLoading, addToSeen, addMatch, incrementLike, incrementSuperlike, setDeck, setLoading 
  } = useMatchesStore()
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
      addToast({ type: 'error', message: 'Likes esgotados. VIP tem likes ilimitados!' })
      return
    }

    try {
      if (profileId.startsWith('u:')) {
        await sendRequest(profileId.slice(2))
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
        await sendRequest(profileId.slice(2))
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

  return html`
    <div class="app-view active">
      <div class="app-greet">
        <div>
          <p class="hello">Boa noite, ${user?.name?.split(' ')[0] || 'Gamer'}</p>
          <h2>Encontre sua <span class="gradient-text">squad</span></h2>
        </div>
      </div>

      <div class="likes-bar">
        <span id="likesInfo">${likesLeft() === Infinity ? 'Likes ilimitados (VIP ativo)' : `${likesLeft()} like${likesLeft() === 1 ? '' : 's'} hoje`}</span>
        ${plan === 'free' ? html`<span style="color: var(--mint);">| ${superlikesLeft()} superlike${superlikesLeft() === 1 ? '' : 's'}</span>` : ''}
        <a href="/planos.html" id="likesUpsell" hidden>Virar VIP = likes ilimitados</a>
      </div>

      <div class="deck-wrap">
        ${currentProfile ? html`
          <div class="deck" id="deck">
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
          </div>
        ` : html`
          <div class="deck-empty" id="deckEmpty">
            <img src="/assets/logo.png" alt="" width="72" height="72">
            <h3>Você viu todo mundo por hoje</h3>
            <p>Volte amanhã para novos jogadores — ou vire VIP para descobrir sem limites.</p>
            <a href="/planos.html" class="btn btn-primary">Ver planos VIP</a>
          </div>
        `}
      </div>

      <div class="deck-actions" id="deckActions">
        <button class="deck-btn pass" id="passBtn" onClick=${() => currentProfile && handlePass(currentProfile.id)} aria-label="Pular perfil">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <button class="deck-btn refresh" id="refreshDeckBtn" onClick=${handleRefresh} disabled=${isRefreshing} aria-label="Atualizar jogadores">
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

      <!-- Matches List -->
      ${matches.length > 0 ? html`
        <div style="margin-top: var(--space-xl); padding: 0 var(--space-xl);">
          <h3 style="margin-bottom: var(--space-md);">Seus Matches</h3>
          <div class="match-list">
            ${matches.map(match => html`
              <button class="match-item" onClick=${() => { /* open chat */ }}>
                <img class="match-avatar" src=${match.avatar} alt=${match.name}>
                <div class="match-info">
                  <div class="match-name">${match.name}</div>
                  <div class="match-meta">
                    <span>${match.rank}</span>
                    <span>${match.games.slice(0, 2).join(', ')}${match.games.length > 2 ? '...' : ''}</span>
                  </div>
                </div>
                <span class="match-unread">1</span>
              </button>
            `)}
          </div>
        </div>
      ` : ''}
    </div>
  `
}