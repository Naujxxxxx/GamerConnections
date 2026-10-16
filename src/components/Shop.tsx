import { html } from 'htm/preact'
import { useUIStore } from '@/stores/ui'

export function renderShop() {
  const { addToast } = useUIStore()
  
  return html`
    <div class="app-view active">
      <div class="app-greet">
        <div>
          <p class="hello">Loja</p>
          <h2>Itens <span class="gradient-text">exclusivos</span></h2>
        </div>
      </div>
      <div class="shop-grid">
        <div class="shop-item">
          <div class="shop-item-image">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 80px; height: 80px;">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <div class="shop-item-info">
            <h3 class="shop-item-name">Dogtag Clássico</h3>
            <p class="shop-item-price">4.900 GC</p>
            <button class="btn btn-primary btn-full" onClick=${() => addToast({ type: 'info', message: 'Em breve!' })}>Comprar</button>
          </div>
        </div>
        <div class="shop-item">
          <div class="shop-item-image">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 80px; height: 80px;">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <div class="shop-item-info">
            <h3 class="shop-item-name">Dogtag Neon</h3>
            <p class="shop-item-price">7.900 GC</p>
            <button class="btn btn-primary btn-full" onClick=${() => addToast({ type: 'info', message: 'Em breve!' })}>Comprar</button>
          </div>
        </div>
        <div class="shop-item">
          <div class="shop-item-image">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 80px; height: 80px;">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <div class="shop-item-info">
            <h3 class="shop-item-name">Dogtag ELITE</h3>
            <p class="shop-item-price">12.900 GC <span style="color: var(--gold);">GRÁTIS p/ ELITE</span></p>
            <button class="btn btn-primary btn-full" onClick=${() => addToast({ type: 'info', message: 'Em breve!' })}>Resgatar</button>
          </div>
        </div>
      </div>
    </div>
  `
}