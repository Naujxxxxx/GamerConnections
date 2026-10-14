import { useEffect, useState } from 'preact/hooks'
import { html } from 'htm/preact'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { useFeedStore } from '@/stores/feed'
import { getProfile, updateProfile, fetchFollowers, fetchFollowing, toggleFollow } from '@/services/supabase'
import { uploadAvatar, uploadBanner } from '@/services/storage'
import { formatRelativeTime } from '@/utils/date'

export function renderProfile(username?: string) {
  const { user, isVip, isElite, isOwner, updateProfile: updateProfileStore } = useAuthStore()
  const { addToast, openModal, closeModal } = useUIStore()
  const { posts: userPosts } = useFeedStore()
  const targetUsername = username || user?.username
  const isOwnProfile = !username || username === user?.username

  const [profile, setProfile] = useState<any>(null)
  const [followers, setFollowers] = useState<string[]>([])
  const [following, setFollowing] = useState<string[]>([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [activeTab, setActiveTab] = useState<'posts' | 'about' | 'highlights'>('posts')
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ bio: '', games: [], hobbies: [], badgeColor: '' })

  useEffect(() => {
    if (targetUsername) {
      loadProfile()
    }
  }, [targetUsername])

  const loadProfile = async () => {
    try {
      const [profileData, followersData, followingData] = await Promise.all([
        getProfile(targetUsername),
        fetchFollowers(targetUsername),
        fetchFollowing(targetUsername)
      ])
      setProfile(profileData)
      setFollowers(followersData)
      setFollowing(followingData)
      setIsFollowing(followingData.includes(targetUsername))
      
      if (isOwnProfile) {
        setEditForm({
          bio: profileData.bio || '',
          games: profileData.games || [],
          hobbies: profileData.hobbies || [],
          badgeColor: profileData.badge_color || ''
        })
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
    }
  }

  const handleFollow = async () => {
    if (!user) return
    try {
      const result = await toggleFollow(targetUsername)
      setIsFollowing(result)
      if (result) {
        setFollowers(prev => [...prev, user.username])
      } else {
        setFollowers(prev => prev.filter(f => f !== user.username))
      }
      addToast({ type: 'success', message: result ? 'Agora você segue este usuário' : 'Deixou de seguir' })
    } catch (error) {
      console.error('Follow failed:', error)
      addToast({ type: 'error', message: 'Erro ao seguir' })
    }
  }

  const handleSaveProfile = async () => {
    try {
      const updated = await updateProfile(editForm)
      updateProfileStore(updated)
      setProfile(updated)
      setIsEditing(false)
      addToast({ type: 'success', message: 'Perfil atualizado!' })
    } catch (error) {
      console.error('Update profile failed:', error)
      addToast({ type: 'error', message: 'Erro ao atualizar' })
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const url = await uploadAvatar(file)
      setEditForm(prev => ({ ...prev, avatar: url }))
      await handleSaveProfile()
    } catch (error) {
      console.error('Avatar upload failed:', error)
      addToast({ type: 'error', message: 'Erro ao enviar avatar' })
    }
  }

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const url = await uploadBanner(file)
      setEditForm(prev => ({ ...prev, banner: url }))
      await handleSaveProfile()
    } catch (error) {
      console.error('Banner upload failed:', error)
      addToast({ type: 'error', message: 'Erro ao enviar banner' })
    }
  }

  const userPostsFiltered = userPosts.filter(p => p.authorUsername === targetUsername)

  if (!profile) {
    return html`
      <div class="app-view active">
        <div class="empty-state" style="flex: 1;">
          <div class="skeleton-card" style="height: 300px;"></div>
        </div>
      </div>
    `
  }

  return html`
    <div class="app-view active">
      <!-- Profile Header -->
      <header class="profile-header">
        ${profile.banner ? html`
          <img class="profile-banner" src=${profile.banner} alt="Banner">
        ` : html`
          <div class="profile-banner" style="background: linear-gradient(135deg, var(--brand-primary), var(--mint));"></div>
        `}
        <div class="profile-gradient"></div>
        ${isOwnProfile && profile.banner ? html`
          <label class="profile-banner-edit" data-tooltip="Alterar banner">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            <input type="file" accept="image/*" onChange=${handleBannerUpload} hidden>
          </label>
        ` : ''}
        <img class="profile-avatar" src=${profile.avatar || '/assets/avatars/avatar1.svg'} alt=${profile.name}>
        ${isOwnProfile ? html`
          <label class="profile-avatar-edit" data-tooltip="Alterar avatar">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            <input type="file" accept="image/*" onChange=${handleAvatarUpload} hidden>
          </label>
        ` : ''}
      </header>

      <div class="profile-info">
        <div class="profile-name-row">
          <h1 class="profile-name">${profile.name}</h1>
          ${profile.badge_color ? html`
            <span class="vip-badge ${profile.plan}" style="background: ${profile.badge_color}; border: none;">${profile.plan?.toUpperCase() || 'FREE'}</span>
          ` : html`
            <span class="vip-badge ${profile.plan || 'free'}">${profile.plan?.toUpperCase() || 'FREE'}</span>
          `}
        </div>
        <div class="profile-username">$${profile.username}</div>

        <div class="profile-stats">
          <div class="stat-item" onClick=${() => { /* open followers modal */ }}>
            <span class="stat-value">${followers.length}</span>
            <span class="stat-label">Seguidores</span>
          </div>
          <div class="stat-item" onClick=${() => { /* open following modal */ }}>
            <span class="stat-value">${following.length}</span>
            <span class="stat-label">Seguindo</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${userPostsFiltered.length}</span>
            <span class="stat-label">Posts</span>
          </div>
        </div>

        ${!isOwnProfile ? html`
          <div style="margin-top: var(--space-md); display: flex; gap: var(--space-sm);">
            <button class="btn btn-primary btn-full" onClick=${handleFollow} style="flex: 1;">
              ${isFollowing ? 'Seguindo ✓' : 'Seguir'}
            </button>
            <button class="btn btn-secondary btn-full" style="flex: 1;" onClick=${() => { /* open DM */ }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Mensagem
            </button>
          </div>
        ` : html`
          <div style="margin-top: var(--space-md); display: flex; gap: var(--space-sm);">
            <button class="btn btn-secondary btn-full" onClick=${() => { setEditForm({ bio: profile.bio || '', games: profile.games || [], hobbies: profile.hobbies || [], badgeColor: profile.badge_color || '' }); setIsEditing(true); }}>
              Editar Perfil
            </button>
            <button class="btn btn-primary btn-full" onClick=${() => openModal('createPost')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Criar Post
            </button>
          </div>
        `}
      </div>

      <!-- Profile Tabs -->
      <nav class="profile-tabs">
        <button class="profile-tab ${activeTab === 'posts' ? 'active' : ''}" onClick=${() => setActiveTab('posts')}>Posts</button>
        <button class="profile-tab ${activeTab === 'about' ? 'active' : ''}" onClick=${() => setActiveTab('about')}>Sobre</button>
        <button class="profile-tab ${activeTab === 'highlights' ? 'active' : ''}" onClick=${() => setActiveTab('highlights')}>Destaques</button>
      </nav>

      <!-- Profile Content -->
      <div class="profile-content">
        ${activeTab === 'posts' ? html`
          ${userPostsFiltered.length === 0 ? html`
            <div class="empty-state">
              <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
              </svg>
              <h3 class="empty-state-title">${isOwnProfile ? 'Nenhum post ainda' : 'Este usuário não postou nada'}</h3>
              <p class="empty-state-text">${isOwnProfile ? 'Compartilhe seu primeiro momento gamer!' : 'Volte mais tarde para ver os posts.'}</p>
            </div>
          ` : userPostsFiltered.map(post => html`
            <article class="post-card" style="margin-bottom: var(--space-md);">
              <div class="post-header">
                <div class="post-author-info">
                  <div class="post-author-name">${profile.name}</div>
                  <div class="post-author-meta">${formatRelativeTime(post.created_at)}</div>
                </div>
              </div>
              ${post.src ? html`
                <div class="post-media">
                  ${post.type === 'video' ? html`<video src=${post.src} controls muted playsinline></video>` : html`<img src=${post.src} alt=${post.caption} loading="lazy">`}
                </div>
              ` : ''}
              ${post.caption ? html`<div class="post-caption"><p>${post.caption}</p></div>` : ''}
              <div class="post-actions">
                <button class="post-action ${post.isLiked ? 'liked' : ''}"><svg width="20" height="20" viewBox="0 0 24 24" fill=${post.isLiked ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg><span>${post.likesCount || 0}</span></button>
                <button class="post-action"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span>${post.commentsCount || 0}</span></button>
              </div>
            </article>
          `)}
        ` : activeTab === 'about' ? html`
          ${isEditing ? html`
            <form onSubmit=${(e: any) => { e.preventDefault(); handleSaveProfile(); }}>
              <div class="form-group">
                <label>Bio</label>
                <textarea value=${editForm.bio} onInput=${(e: any) => setEditForm(prev => ({ ...prev, bio: e.target.value }))} rows="4" maxlength="500" placeholder="Conte sobre você..."></textarea>
              </div>
              <div class="form-group">
                <label>Jogos</label>
                <input type="text" value=${editForm.games.join(', ')} onInput=${(e: any) => setEditForm(prev => ({ ...prev, games: e.target.value.split(',').map(g => g.trim()).filter(Boolean) }))} placeholder="Valorant, LoL, CS2...">
              </div>
              <div class="form-group">
                <label>Hobbies</label>
                <input type="text" value=${editForm.hobbies.join(', ')} onInput=${(e: any) => setEditForm(prev => ({ ...prev, hobbies: e.target.value.split(',').map(h => h.trim()).filter(Boolean) }))} placeholder="Streaming, Cosplay, Colecionismo...">
              </div>
              ${isVip || isElite || isOwner ? html`
                <div class="form-group">
                  <label>Cor do selo VIP</label>
                  <input type="color" value=${editForm.badgeColor || '#22d3ee'} onInput=${(e: any) => setEditForm(prev => ({ ...prev, badgeColor: e.target.value }))}>
                </div>
              ` : ''}
              <div style="display: flex; gap: var(--space-sm); margin-top: var(--space-lg);">
                <button type="submit" class="btn btn-primary btn-full">Salvar</button>
                <button type="button" class="btn btn-secondary btn-full" onClick=${() => setIsEditing(false)}>Cancelar</button>
              </div>
            </form>
          ` : html`
            <div class="profile-bio">${profile.bio || 'Este gamer ainda não escreveu uma bio.'}</div>
            ${profile.games?.length ? html`
              <div class="profile-games">
                ${profile.games.map(g => html`<span class="profile-game">${g}</span>`).join('')}
              </div>
            ` : ''}
            ${profile.hobbies?.length ? html`
              <div style="margin-top: var(--space-lg);">
                <h4 style="margin-bottom: var(--space-sm);">Hobbies</h4>
                <div class="profile-games">
                  ${profile.hobbies.map(h => html`<span class="profile-game">${h}</span>`).join('')}
                </div>
              </div>
            ` : ''}
          `}
        ` : activeTab === 'highlights' ? html`
          <div class="empty-state">
            <h3 class="empty-state-title">Destaques</h3>
            <p class="empty-state-text">${isOwnProfile ? 'Adicione seus melhores momentos ao perfil' : 'Este usuário não tem destaques'}</p>
            ${isOwnProfile && html`<button class="btn btn-primary" style="margin-top: var(--space-md);" onClick=${() => openModal('createHighlight')}>Criar Destaque</button>`}
          </div>
        ` : ''}
      </div>

      ${isEditing && html`
        <div class="modal-overlay open" onClick=${() => setIsEditing(false)}>
          <div class="modal" onClick=${e => e.stopPropagation()}>
            <div class="modal-header">
              <h2 class="modal-title">Editar Perfil</h2>
              <button class="modal-close" onClick=${() => setIsEditing(false)}>✕</button>
            </div>
            <div class="modal-body">
              <form onSubmit=${(e: any) => { e.preventDefault(); handleSaveProfile(); }}>
                <div class="form-group">
                  <label>Bio</label>
                  <textarea value=${editForm.bio} onInput=${(e: any) => setEditForm(prev => ({ ...prev, bio: e.target.value }))} rows="4" maxlength="500" placeholder="Conte sobre você..."></textarea>
                </div>
                <div class="form-group">
                  <label>Jogos (separados por vírgula)</label>
                  <input type="text" value=${editForm.games.join(', ')} onInput=${(e: any) => setEditForm(prev => ({ ...prev, games: e.target.value.split(',').map(g => g.trim()).filter(Boolean) }))} placeholder="Valorant, LoL, CS2...">
                </div>
                <div class="form-group">
                  <label>Hobbies (separados por vírgula)</label>
                  <input type="text" value=${editForm.hobbies.join(', ')} onInput=${(e: any) => setEditForm(prev => ({ ...prev, hobbies: e.target.value.split(',').map(h => h.trim()).filter(Boolean) }))} placeholder="Streaming, Cosplay, Colecionismo...">
                </div>
                ${isVip || isElite || isOwner ? html`
                  <div class="form-group">
                    <label>Cor do selo VIP</label>
                    <input type="color" value=${editForm.badgeColor || '#22d3ee'} onInput=${(e: any) => setEditForm(prev => ({ ...prev, badgeColor: e.target.value }))}>
                  </div>
                ` : ''}
              <div class="modal-footer">
                <button type="submit" class="btn btn-primary">Salvar</button>
                <button type="button" class="btn btn-secondary" onClick=${() => setIsEditing(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      `}
    </div>
  `
}