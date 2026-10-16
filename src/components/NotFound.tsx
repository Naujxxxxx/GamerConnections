import { html } from 'htm/preact'

export function renderNotFound() {
  return html`
    <div class="app-view active" style="display: flex; align-items: center; justify-content: center; min-height: 100vh; text-align: center; padding: 40px;">
      <div style="max-width: 400px;">
        <div style="font-size: 120px; color: var(--brand); line-height: 1; margin-bottom: 20px;">404</div>
        <h1 style="margin-bottom: 16px;">Página não encontrada</h1>
        <p style="color: var(--text-2); margin-bottom: 32px;">Oops! Parece que esta página não existe ou foi movida.</p>
        <a href="/" class="btn btn-primary" onclick=${(e) => { e.preventDefault(); window.history.pushState(null, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')) }}>
          Voltar ao início
        </a>
      </div>
    </div>
  `
}