import { html } from 'htm/preact'
import { useUIStore } from '@/stores/ui'

export function renderRooms() {
  const { addToast } = useUIStore()
  
  return html`
    <div class="app-view active">
      <div class="app-greet">
        <div>
          <p class="hello">Salas</p>
          <h2>Salas de <span class="gradient-text">chat</span></h2>
        </div>
      </div>
      <div class="rooms-grid">
        <div class="empty-state">
          <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <h3 class="empty-state-title">Nenhuma sala ainda</h3>
          <p class="empty-state-text">Crie uma sala para começar a conversar com seus amigos.</p>
          <button class="btn btn-primary" onClick=${() => addToast({ type: 'info', message: 'Em breve!' })}>Criar Sala</button>
        </div>
      </div>
    </div>
  `
}