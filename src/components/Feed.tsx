import { useEffect, useState, useCallback } from 'preact/hooks'
import { html } from 'htm/preact'
import { useFeedStore } from '@/stores/feed'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { fetchFeed, createPost, toggleLike, addComment, fetchComments } from '@/services/supabase'
import { formatRelativeTime } from '@/utils/date'

export function renderFeed() {
  const { posts, isLoading, hasMore, cursor, appendPosts, setLoading, onPostInsert, onPostUpdate, onPostDelete, onLikeInsert, onLikeDelete, onCommentInsert, onCommentDelete } = useFeedStore()
  const { user, isVip } = useAuthStore()
  const { addToast, modals, openModal, closeModal } = useUIStore()
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [postText, setPostText] = useState('')
  const [postGame, setPostGame] = useState('')
  const [postMedia, setPostMedia] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(0)

  useEffect(() => {
    if (posts.length === 0 && !isLoading) {
      loadFeed()
    }
  }, [])

  const loadFeed = useCallback(async () => {
    setLoading(true)
    try {
      const { posts: newPosts, hasMore: more } = await fetchFeed(page)
      if (page === 0) {
        useFeedStore.getState().setPosts(newPosts)
      } else {
        appendPosts(newPosts)
      }
      setPage(p => p + 1)
      return more
    } catch (error) {
      console.error('Failed to load feed:', error)
      addToast({ type: 'error', message: 'Erro ao carregar feed' })
      return false
    } finally {
      setLoading(false)
    }
  }, [page, setLoading, appendPosts, addToast])

  const handleLoadMore = useCallback(async () => {
    const more = await loadFeed()
    if (!more) {
      addToast({ type: 'info', message: 'Fim do feed' })
    }
  }, [loadFeed, addToast])

  const handleCreatePost = useCallback(async () => {
    if (!postText.trim() && !postMedia) {
      addToast({ type: 'error', message: 'Adicione texto ou mídia' })
      return
    }
    if (postText.length > 2000) {
      addToast({ type: 'error', message: 'Máximo 2000 caracteres' })
      return
    }

    setIsSubmitting(true)
    try {
      let mediaUrl: string | null = null
      if (postMedia) {
        const { uploadMedia } = await import('@/services/storage')
        mediaUrl = await uploadMedia(postMedia, 'posts')
      }

      const newPost = await createPost({
        type: postMedia?.type.startsWith('video/') ? 'video' : 'photo',
        src: mediaUrl || postMediaPreview || '',
        caption: postText || undefined,
        game: postGame || undefined
      })

      closeModal('createPost')
      setPostText('')
      setPostGame('')
      setPostMedia(null)
      setMediaPreview(null)
      addToast({ type: 'success', message: 'Post publicado!' })
    } catch (error) {
      console.error('Create post failed:', error)
      addToast({ type: 'error', message: 'Erro ao publicar' })
    } finally {
      setIsSubmitting(false)
    }
  }, [postText, postMedia, postGame, postMediaPreview, addToast])

  const handleLike = useCallback(async (postId: string, currentlyLiked: boolean) => {
    try {
      await toggleLike(postId)
    } catch (error) {
      console.error('Like failed:', error)
      addToast({ type: 'error', message: 'Erro ao curtir' })
    }
  }, [addToast])

  const handleCommentSubmit = useCallback(async (postId: string, text: string) => {
    if (!text.trim()) return
    try {
      await addComment(postId, text)
    } catch (error) {
      console.error('Comment failed:', error)
      addToast({ type: 'error', message: 'Erro ao comentar' })
    }
  }, [addToast])

  const handleMediaSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const validation = file.type.startsWith('video/') 
        ? (await import('@/services/storage')).validateVideoFile(file)
        : (await import('@/services/storage')).validateImageFile(file)
      
      if (!validation.valid) {
        addToast({ type: 'error', message: validation.error })
        return
      }
      
      setPostMedia(file)
      setMediaPreview(URL.createObjectURL(file))
    }
  }, [addToast])

  return html`
    <div class="app-view active">
      <div class="app-greet">
        <div>
          <p class="hello">Comunidade</p>
          <h2>Feed <span class="gradient-text">global</span></h2>
        </div>
      </div>

      <div class="search-wrap">
        <div class="search-box">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" id="userSearch" placeholder="Pesquisar... use $ para usuários" autocomplete="off" maxlength="30">
        </div>
      </div>

      <!-- Create Post Card -->
      <article class="post-card create-post-card">
        <div class="post-header">
          <img class="avatar" src=${user?.avatar || '/assets/avatars/avatar1.svg'} alt=${user?.name}>
          <div class="post-author-info">
            <div class="post-author-name">${user?.name}</div>
            <div class="post-author-meta">O que você está jogando hoje?</div>
          </div>
        </div>
        
        <textarea 
          class="create-post-textarea"
          placeholder="Compartilhe seu momento gamer... #hashtag @usuario"
          value=${postText}
          onInput=${(e: any) => setPostText(e.target.value)}
          rows="3"
          maxlength="2000"
        ></textarea>

        ${postMediaPreview ? html`
          <div class="post-media-preview">
            ${postMedia?.type.startsWith('video/') ? html`
              <video src=${postMediaPreview} controls muted></video>
            ` : html`
              <img src=${postMediaPreview} alt="Preview">
            `}
            <button class="remove-media" onClick=${() => { setPostMedia(null); setMediaPreview(null); }}>✕</button>
          </div>
        ` : ''}

        <div class="create-post-footer">
          <div class="create-post-options">
            <label class="tooltip" data-tooltip="Adicionar jogo">
              <input type="text" placeholder="Jogo (opcional)" value=${postGame} onInput=${(e: any) => setPostGame(e.target.value)} maxlength="50">
            </label>
            <label class="tooltip" data-tooltip="Adicionar foto/vídeo">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
              </svg>
              <input type="file" accept="image/*,video/*" onChange=${handleMediaSelect} hidden>
            </label>
          </div>
          <button class="btn btn-primary" onClick=${handleCreatePost} disabled=${isSubmitting || (!postText.trim() && !postMedia)}>
            ${isSubmitting ? html`<span class="btn-loader"><svg class="spinner" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/></svg></span>` : 'Publicar'}
          </button>
        </div>
      </article>

      <!-- Feed List -->
      <div class="feed-list" id="feedList" onScroll=${(e: any) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target
        if (scrollTop + clientHeight >= scrollHeight - 200 && hasMore && !isLoading) {
          handleLoadMore()
        }
      }}>
        ${posts.length === 0 && !isLoading ? html`
          <div class="empty-state">
            <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
            <h3 class="empty-state-title">Nenhum post ainda</h3>
            <p class="empty-state-text">Seja o primeiro a postar! Compartilhe seu setup, clip ou conquista.</p>
          </div>
        ` : html`
          ${posts.map(post => html`
            <article class="post-card" data-post-id=${post.id}>
              <div class="post-header">
                <a class="post-author" href=${`/profile/${post.author.username}`}>
                  <img src=${post.author.avatar || '/assets/avatars/avatar1.svg'} alt=${post.author.name}>
                  <div class="post-author-info">
                    <div class="post-author-name">${post.author.name}</div>
                    <div class="post-author-meta">$${post.author.username} • ${formatRelativeTime(post.created_at)}</div>
                  </div>
                </a>
                <div class="post-menu">
                  <div class="dropdown">
                    <button class="btn-ghost" aria-label="Mais opções">⋯</button>
                    <div class="dropdown-menu">
                      ${post.author.username === user?.username ? html`
                        <button class="dropdown-item" onClick=${() => { /* delete post */ }}>Excluir</button>
                      ` : html`
                        <button class="dropdown-item" onClick=${() => { /* report */ }}>Denunciar</button>
                        <button class="dropdown-item" onClick=${() => { /* block */ }}>Bloquear usuário</button>
                      `}
                    </div>
                  </div>
                </div>
              </div>

              ${post.type === 'photo' && post.src ? html`
                <div class="post-media">
                  <img src=${post.src} alt=${post.caption || 'Post image'} loading="lazy">
                </div>
              ` : post.type === 'video' && post.src ? html`
                <div class="post-media">
                  <video src=${post.src} controls poster=${post.caption ? '' : undefined} muted playsinline></video>
                </div>
              ` : ''}

              ${post.caption ? html`
                <div class="post-caption">
                  <p>${post.caption.replace(/#(\w+)/g, '<span class="hashtag">#$1</span>').replace(/@(\w+)/g, '<span class="mention">@$1</span>')}</p>
                </div>
              ` : ''}

              ${post.game ? html`
                <div class="post-game-tag">
                  <span class="badge badge-primary">${post.game}</span>
                </div>
              ` : ''}

              <div class="post-actions">
                <button 
                  class="post-action ${post.isLiked ? 'liked' : ''}" 
                  onClick=${() => handleLike(post.id, post.isLiked)}
                  aria-label=${post.isLiked ? 'Descurtir' : 'Curtir'}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill=${post.isLiked ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  <span>${post.likesCount > 0 ? post.likesCount : ''}</span>
                </button>
                <button 
                  class="post-action" 
                  onClick=${() => { setExpandedPosts(prev => new Set(prev).add(post.id)); }}
                  aria-label="Comentários"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <span>${post.commentsCount > 0 ? post.commentsCount : ''}</span>
                </button>
                <button class="post-action" aria-label="Compartilhar">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                  </svg>
                </button>
                <button class="post-action" aria-label="Salvar">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                  </svg>
                </button>
              </div>

              <div class="post-stats">
                <span>${post.likesCount} curtida${post.likesCount !== 1 ? 's' : ''}</span>
                <span>${post.commentsCount} comentário${post.commentsCount !== 1 ? 's' : ''}</span>
              </div>

              ${expandedPosts.has(post.id) ? html`
                <div class="comments-section" data-post-id=${post.id}>
                  <form class="comment-form" onSubmit=${(e: any) => { e.preventDefault(); const text = e.target.elements.comment.value.trim(); if (text) { handleCommentSubmit(post.id, text); e.target.reset(); } }}>
                    <img class="avatar avatar-sm" src=${user?.avatar || '/assets/avatars/avatar1.svg'} alt="Você">
                    <input type="text" name="comment" placeholder="Escreva um comentário..." maxlength="1000" required>
                    <button type="submit" class="btn btn-primary btn-sm">Enviar</button>
                  </form>
                  <div class="comments-list">
                    ${post.comments?.map(comment => html`
                      <div class="comment-row">
                        <img class="comment-avatar" src=${comment.author.avatar || '/assets/avatars/avatar1.svg'} alt=${comment.author.name}>
                        <div class="comment-body">
                          <div class="comment-author">${comment.author.name}</div>
                          <div class="comment-text">${comment.text}</div>
                          <div class="comment-time">${formatRelativeTime(comment.created_at)}</div>
                        </div>
                      </div>
                    `).join('') || html`<p class="comment-empty">Nenhum comentário ainda. Seja o primeiro!</p>`}
                  </div>
                </div>
              ` : ''}
            </article>
          `)}
        `}
        
        ${hasMore && !isLoading ? html`
          <button class="btn btn-secondary btn-full load-more" onClick=${handleLoadMore}>
            Carregar mais
          </button>
        ` : ''}
        
        ${isLoading && posts.length > 0 ? html`
          <div class="loading-indicator">
            <svg class="spinner" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/></svg>
          </div>
        ` : ''}
      </div>
    </div>
  `
}