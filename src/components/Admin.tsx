import { html } from 'htm/preact'
import { useUIStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'

export function renderAdmin() {
  const { addToast } = useUIStore()
  const { isOwner } = useAuthStore()
  
  if (!isOwner()) {
    return html`
      <div class="app-view active">
        <div class="empty-state">
          <h3 class="empty-state-title">Acesso negado</h3>
          <p class="empty-state-text">Apenas o CEO pode acessar o painel administrativo.</p>
        </div>
      </div>
    `
  }
  
  return html`
    <div class="app-view active">
      <div class="app-greet">
        <div>
          <p class="hello">Painel Admin</p>
          <h2>Gerenciamento do <span class="gradient-text">sistema</span></h2>
        </div>
      </div>
      <div class="admin-sections">
        <div class="admin-card">
          <h3>Usuários</h3>
          <button class="btn btn-secondary" onClick=${() => addToast({ type: 'info', message: 'Em breve!' })}>Gerenciar usuários</button>
        </div>
        <div class="admin-card">
          <h3>Medalhas</h3>
          <button class="btn btn-secondary" onClick=${() => addToast({ type: 'info', message: 'Em breve!' })}>Criar medalhas</button>
        </div>
        <div class="admin-card">
          <h3>Tags bloqueadas</h3>
          <button class="btn btn-secondary" onClick=${() => addToast({ type: 'info', message: 'Em breve!' })}>Gerenciar tags</button>
        </div>
        <div class="admin-card">
          <h3>Planos</h3>
          <button class="btn btn-secondary" onClick=${() => addToast({ type: 'info', message: 'Em breve!' })}>Editar planos</button>
        </div>
      </div>
    </div>
  `
}