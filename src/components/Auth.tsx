import { html } from 'htm/preact'
import { useUIStore } from '@/stores/ui'

export function renderLogin() {
  const { addToast } = useUIStore()
  
  return html`
    <div class="app-view active" style="display: flex; align-items: center; justify-content: center; min-height: 100vh;">
      <div class="auth-card" style="width: 100%; max-width: 420px;">
        <div class="auth-header">
          <h1>Bem-vindo de volta, <span class="gradient-text">Gamer</span></h1>
          <p>Entre na sua conta para continuar</p>
        </div>
        <form id="loginForm" class="auth-form" onSubmit=${(e) => { e.preventDefault(); addToast({ type: 'info', message: 'Em breve!' }) }}>
          <div class="form-group">
            <label for="username">Usuário ou Email</label>
            <div class="input-wrapper">
              <svg class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <input type="text" id="username" name="username" placeholder="Digite seu usuário ou email" required autocomplete="username">
            </div>
          </div>
          <div class="form-group">
            <label for="password">Senha</label>
            <div class="input-wrapper">
              <svg class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input type="password" id="password" name="password" placeholder="Digite sua senha" required autocomplete="current-password">
            </div>
          </div>
          <button type="submit" class="btn btn-primary btn-full btn-large">
            <span class="btn-text">Entrar</span>
          </button>
        </form>
        <p class="auth-footer">Não tem conta? <a href="/register" onclick=${(e) => { e.preventDefault(); window.history.pushState(null, '', '/register'); window.dispatchEvent(new PopStateEvent('popstate')) }}>Cadastre-se grátis</a></p>
      </div>
    </div>
  `
}

export function renderRegister() {
  const { addToast } = useUIStore()
  
  return html`
    <div class="app-view active" style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px;">
      <div class="auth-card" style="width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto;">
        <div class="auth-header">
          <h1>Crie sua conta, <span class="gradient-text">Gamer</span></h1>
          <p>Junte-se à comunidade e encontre seu Player 2</p>
        </div>
        <form id="registerForm" class="auth-form" onSubmit=${(e) => { e.preventDefault(); addToast({ type: 'info', message: 'Em breve!' }) }}>
          <div class="form-row">
            <div class="form-group">
              <label for="nome">Nome Completo <span class="required">*</span></label>
              <div class="input-wrapper">
                <svg class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <input type="text" id="nome" name="nome" placeholder="Seu nome completo" required autocomplete="name">
              </div>
            </div>
            <div class="form-group">
              <label for="username">Username <span class="required">*</span></label>
              <div class="input-wrapper">
                <span class="input-prefix">$</span>
                <svg class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <input type="text" id="username" name="username" placeholder="Escolha seu $username" required autocomplete="username" pattern="[a-zA-Z0-9_]{3,20}" minlength="3" maxlength="20">
              </div>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="email">Email <span class="required">*</span></label>
              <div class="input-wrapper">
                <svg class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <input type="email" id="email" name="email" placeholder="seu@email.com" required autocomplete="email">
              </div>
            </div>
            <div class="form-group">
              <label for="birthdate">Data de Nascimento <span class="required">*</span></label>
              <div class="input-wrapper">
                <svg class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <input type="date" id="birthdate" name="birthdate" required>
              </div>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="password">Senha <span class="required">*</span></label>
              <div class="input-wrapper">
                <svg class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input type="password" id="password" name="password" placeholder="Mínimo 8 caracteres" required autocomplete="new-password" minlength="8">
              </div>
            </div>
            <div class="form-group">
              <label for="confirmPassword">Confirmar Senha <span class="required">*</span></label>
              <div class="input-wrapper">
                <svg class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input type="password" id="confirmPassword" name="confirmPassword" placeholder="Confirme sua senha" required autocomplete="new-password">
              </div>
            </div>
          </div>
          <div class="form-group">
            <label>Seu gênero <span class="required">*</span></label>
            <div class="pill-group">
              <label><input type="radio" name="gender" value="M" required> Masculino</label>
              <label><input type="radio" name="gender" value="F"> Feminino</label>
            </div>
          </div>
          <div class="form-group">
            <label>Quem você busca <span class="required">*</span></label>
            <div class="pill-group">
              <label><input type="radio" name="lookingFor" value="M" required> Homens</label>
              <label><input type="radio" name="lookingFor" value="F"> Mulheres</label>
              <label><input type="radio" name="lookingFor" value="both"> Ambos</label>
            </div>
          </div>
          <div class="form-group">
            <label>Interesses <span class="required">*</span></label>
            <div class="pill-group">
              <label><input type="checkbox" name="interests" value="Amizade"> Amizade</label>
              <label><input type="checkbox" name="interests" value="Namoro"> Namoro</label>
              <label><input type="checkbox" name="interests" value="Duo"> Duo</label>
            </div>
          </div>
          <div class="form-group terms-group">
            <label class="checkbox-wrapper">
              <input type="checkbox" id="terms" name="terms" required>
              <span class="checkmark"></span>
              Concordo com os <a href="#">Termos de Uso</a> e <a href="#">Política de Privacidade</a>
            </label>
          </div>
          <button type="submit" class="btn btn-primary btn-full btn-large">
            <span class="btn-text">Criar Conta</span>
          </button>
          <p class="auth-footer">Já tem conta? <a href="/login" onclick=${(e) => { e.preventDefault(); window.history.pushState(null, '', '/login'); window.dispatchEvent(new PopStateEvent('popstate')) }}>Faça login</a></p>
        </form>
      </div>
    </div>
  `
}