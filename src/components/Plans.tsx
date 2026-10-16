import { html } from 'htm/preact'
import { useUIStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'

export function renderPlans() {
  const { addToast } = useUIStore()
  const { plan, isVip, isElite, isOwner } = useAuthStore()
  
  const plans = [
    { id: 'free', name: 'FREE', price: 0, features: ['5 likes/dia', '1 superlike/dia', 'Perfil básico'], current: plan === 'free' },
    { id: 'vip', name: 'VIP', price: 19.90, features: ['Likes ilimitados', 'Superlikes ilimitados', 'Cor do selo', 'Badge VIP', 'Salas privadas'], current: plan === 'vip', popular: true },
    { id: 'elite', name: 'ELITE', price: 34.90, features: ['Tudo do VIP', 'Dogtags ELITE grátis', 'Destaque no perfil', 'Modo invisível', 'Estatísticas avançadas'], current: plan === 'elite' },
    { id: 'ceo', name: 'CEO', price: 0, features: ['Tudo do ELITE', 'Painel Admin', 'Criar medalhas', 'Gerenciar usuários', 'Acesso total'], current: isOwner() }
  ]
  
  return html`
    <div class="app-view active">
      <div class="app-greet">
        <div>
          <p class="hello">Escolha seu plano</p>
          <h2>Desbloqueie <span class="gradient-text">recursos premium</span></h2>
        </div>
      </div>
      <div class="plans-grid">
        ${plans.map(p => html`
          <div class="plan-card ${p.current ? 'current' : ''} ${p.popular ? 'popular' : ''}">
            ${p.popular ? html`<span class="plan-badge">Mais popular</span>` : ''}
            <div class="plan-header">
              <h3>${p.name}</h3>
              <div class="plan-price">
                <span class="amount">${p.price === 0 ? 'Grátis' : `R$ ${p.price.toFixed(2)}`}</span>
                ${p.price > 0 ? html`<span class="period">/mês</span>` : ''}
              </div>
            </div>
            <ul class="plan-features">
              ${p.features.map(f => html`<li>${f}</li>`).join('')}
            </ul>
            <button 
              class="btn ${p.current ? 'btn-secondary' : 'btn-primary'} btn-full" 
              disabled=${p.current}
              onClick=${() => {
                if (!p.current) {
                  if (p.id === 'ceo') {
                    addToast({ type: 'error', message: 'Acesso restrito ao CEO' })
                  } else {
                    addToast({ type: 'info', message: 'Pagamento em breve!' })
                  }
                }
              }}
            >
              ${p.current ? 'Plano atual' : p.price === 0 ? 'Selecionar' : 'Assinar'}
            </button>
          </div>
        `).join('')}
      </div>
      <div style="margin-top: 40px; padding: 20px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-light);">
        <h3>Códigos de resgate</h3>
        <div style="display: grid; gap: 12px; margin-top: 16px; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));">
          <div class="code-card">
            <code>BETA-USER</code>
            <p>Medalha BETA</p>
          </div>
          <div class="code-card">
            <code>VIP-TOTAL</code>
            <p>Plano ELITE</p>
          </div>
          <div class="code-card">
            <code>CEO-ACCESS</code>
            <p>Acesso CEO (uso único)</p>
          </div>
        </div>
      </div>
    </div>
  `
}