import { supabase, from } from '@/config/supabase'
import type { Profile, Post, Comment, Group, ChatMessage } from '@/types/database'
import type { FeedPost, MatchProfile, UserProfile } from '@/types/ui'
import { useAuthStore } from '@/stores/auth'
import { useFeedStore } from '@/stores/feed'
import { useChatStore } from '@/stores/chat'
import { useMatchesStore } from '@/stores/matches'
import { useNotificationsStore } from '@/stores/notifications'
import { useUIStore } from '@/stores/ui'

// ============ AUTH ============
export async function signUp(data: {
  email: string
  password: string
  username: string
  name: string
  birthdate: string
  gender: 'M' | 'F'
  lookingFor: 'M' | 'F' | 'both'
  intents: string[]
  avatar?: string
}) {
  // Hash password via Edge Function
  const { hash } = await fetch('/functions/v1/hash-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: data.password })
  }).then(r => r.json())

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: { username: data.username, full_name: data.name }
    }
  })

  if (authError) throw authError

  // Create profile
  const profile = {
    id: authData.user!.id,
    username: data.username,
    email: data.email,
    name: data.name,
    birthdate: data.birthdate,
    gender: data.gender,
    looking_for: data.lookingFor,
    intents: data.intents,
    avatar: data.avatar || '/assets/avatars/avatar1.svg',
    password_hash: hash,
    plan: 'free'
  }

  const { error: profileError } = await from('profiles').insert(profile)
  if (profileError) throw profileError

  // Auto-follow nauj
  await from('follows').insert({
    follower: data.username,
    following: 'u:nauj'
  })

  return { user: profile, session: authData.session }
}

export async function signIn(identifier: string, password: string) {
  // Find user by username or email
  const { data: profile } = await from('profiles')
    .select('*')
    .or(`username.eq.${identifier},email.eq.${identifier}`)
    .single()

  if (!profile) throw new Error('Usuário não encontrado')

  // Verify password via Edge Function
  const { hash } = await fetch('/functions/v1/hash-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  }).then(r => r.json())

  if (hash !== profile.password_hash) throw new Error('Senha incorreta')

  // Sign in with Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password
  })

  if (error) throw error

  return { user: profile as UserProfile, session: data.session }
}

export async function signOut() {
  await supabase.auth.signOut()
  useAuthStore.getState().logout()
  useFeedStore.getState().setPosts([])
  useChatStore.getState().setItems({})
  useMatchesStore.getState().setDeck([])
  useNotificationsStore.getState().clearAll()
}

export async function getProfile(username: string) {
  const { data, error } = await from('profiles')
    .select('*')
    .eq('username', username)
    .single()
  
  if (error) throw error
  return data as UserProfile
}

export async function updateProfile(updates: Partial<UserProfile>) {
  const user = useAuthStore.getState().user
  if (!user) throw new Error('Não autenticado')

  const { data, error } = await from('profiles')
    .update(updates)
    .eq('username', user.username)
    .select()
    .single()

  if (error) throw error
  
  useAuthStore.getState().updateProfile(data)
  return data
}

// ============ FEED ============
export async function fetchFeed(page = 0, pageSize = 20) {
  const { data, error, count } = await from('posts')
    .select(`
      *,
      profiles!posts_author_username_fkey (
        username, name, avatar, badge_color, plan
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (error) throw error

  const currentUser = useAuthStore.getState().user
  const userLikes = currentUser ? await getUserLikes(currentUser.username) : new Set()

  const posts: FeedPost[] = (data || []).map((p: any) => ({
    ...p,
    author: p.profiles,
    likesCount: 0, // Will be populated by likes
    commentsCount: 0,
    isLiked: userLikes.has(p.id)
  }))

  // Fetch likes count
  const postIds = posts.map(p => p.id)
  if (postIds.length) {
    const { data: likes } = await from('post_likes')
      .select('post_id')
      .in('post_id', postIds)
    
    const likesCount = new Map<string, number>()
    likes?.forEach(l => likesCount.set(l.post_id, (likesCount.get(l.post_id) || 0) + 1))
    
    posts.forEach(p => p.likesCount = likesCount.get(p.id) || 0)
  }

  return { posts, count: count || 0, hasMore: posts.length === pageSize }
}

export async function getUserLikes(username: string) {
  const { data } = await from('post_likes')
    .select('post_id')
    .eq('username', username)
  return new Set(data?.map(l => l.post_id) || [])
}

export async function createPost(data: { type: 'photo' | 'video'; src: string; caption?: string; game?: string }) {
  const user = useAuthStore.getState().user
  if (!user) throw new Error('Não autenticado')

  const { data: post, error } = await from('posts').insert({
    author_username: user.username,
    type: data.type,
    src: data.src,
    caption: data.caption || null,
    game: data.game || 'Geral'
  }).select().single()

  if (error) throw error

  // Create notification for followers
  await notifyFollowers(user.username, 'post', post.id)

  return post
}

export async function toggleLike(postId: string) {
  const user = useAuthStore.getState().user
  if (!user) throw new Error('Não autenticado')

  const { data: existing } = await from('post_likes')
    .select('*')
    .eq('post_id', postId)
    .eq('username', user.username)
    .maybeSingle()

  if (existing) {
    await from('post_likes').delete().eq('post_id', postId).eq('username', user.username)
    useFeedStore.getState().unlikePost(postId, user.username)
    return false
  } else {
    await from('post_likes').insert({ post_id: postId, username: user.username })
    useFeedStore.getState().likePost(postId, user.username)
    
    // Notify post author
    const { data: post } = await from('posts').select('author_username').eq('id', postId).single()
    if (post && post.author_username !== user.username) {
      await createNotification({
        type: 'like',
        title: 'Nova curtida',
        body: `${user.name} curtiu seu post`,
        actorId: user.username,
        targetId: postId,
        targetType: 'post',
        recipientId: post.author_username
      })
    }
    return true
  }
}

export async function addComment(postId: string, text: string) {
  const user = useAuthStore.getState().user
  if (!user) throw new Error('Não autenticado')

  const { data: comment, error } = await from('comments').insert({
    post_id: postId,
    username: user.username,
    text
  }).select(`
    *,
    profiles!comments_username_fkey (username, name, avatar, badge_color)
  `).single()

  if (error) throw error

  const formatted: FeedComment = {
    ...comment,
    author: comment.profiles
  }

  useFeedStore.getState().addComment(postId, formatted)

  // Notify post author
  const { data: post } = await from('posts').select('author_username').eq('id', postId).single()
  if (post && post.author_username !== user.username) {
    await createNotification({
      type: 'comment',
      title: 'Novo comentário',
      body: `${user.name} comentou: "${text.slice(0, 50)}..."`,
      actorId: user.username,
      targetId: postId,
      targetType: 'post',
      recipientId: post.author_username
    })
  }

  return formatted
}

export async function fetchComments(postId: string) {
  const { data, error } = await from('comments')
    .select(`
      *,
      profiles!comments_username_fkey (username, name, avatar, badge_color)
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  if (error) throw error

  return (data || []).map((c: any) => ({
    ...c,
    author: c.profiles
  })) as FeedComment[]
}

// ============ FOLLOWS ============
export async function toggleFollow(targetUsername: string) {
  const user = useAuthStore.getState().user
  if (!user) throw new Error('Não autenticado')
  if (user.username === targetUsername) throw new Error('Não pode seguir a si mesmo')

  const { data: existing } = await from('follows')
    .select('*')
    .eq('follower', user.username)
    .eq('following', targetUsername)
    .maybeSingle()

  if (existing) {
    await from('follows').delete().eq('follower', user.username).eq('following', targetUsername)
    return false
  } else {
    await from('follows').insert({ follower: user.username, following: targetUsername })
    
    // Notify followed user
    await createNotification({
      type: 'follow',
      title: 'Novo seguidor',
      body: `${user.name} começou a te seguir`,
      actorId: user.username,
      targetId: targetUsername,
      targetType: 'profile',
      recipientId: targetUsername
    })
    return true
  }
}

export async function getFollowers(username: string) {
  const { data, error } = await from('follows')
    .select('follower')
    .eq('following', username)
  if (error) throw error
  return data?.map(f => f.follower) || []
}

export async function getFollowing(username: string) {
  const { data, error } = await from('follows')
    .select('following')
    .eq('follower', username)
  if (error) throw error
  return data?.map(f => f.following) || []
}

// Aliases for backward compatibility
export const fetchFollowers = getFollowers
export const fetchFollowing = getFollowing

// ============ FRIEND REQUESTS ============
export async function sendRequest(targetUsername: string) {
  const user = useAuthStore.getState().user
  if (!user) throw new Error('Não autenticado')
  if (user.username === targetUsername) throw new Error('Não pode adicionar a si mesmo')

  const { data: existing } = await from('friend_requests')
    .select('*')
    .eq('from_username', user.username)
    .eq('to_username', targetUsername)
    .maybeSingle()

  if (existing) throw new Error('Solicitação já enviada')

  // Check if already friends
  const { data: alreadyFriends } = await from('follows')
    .select('*')
    .eq('follower', user.username)
    .eq('following', targetUsername)
    .maybeSingle()

  if (alreadyFriends) throw new Error('Vocês já são amigos')

  const { error } = await from('friend_requests').insert({
    from_username: user.username,
    to_username: targetUsername
  })
  if (error) throw error

  // Notify target user
  await createNotification({
    type: 'follow',
    title: 'Nova solicitação de amizade',
    body: `${user.name} quer ser seu amigo`,
    actorId: user.username,
    targetId: targetUsername,
    targetType: 'profile',
    recipientId: targetUsername
  })

  return true
}

// ============ MATCHES ============
export async function fetchDiscoverProfiles(excludeIds: string[] = []) {
  const user = useAuthStore.getState().user
  if (!user) return []

  const { data, error } = await from('profiles')
    .select('*')
    .neq('username', user.username)
    .not('username', 'in', `(${excludeIds.join(',')})`)
    .limit(20)

  if (error) throw error

  return (data || []).map((p: any) => ({
    id: `u:${p.username}`,
    username: p.username,
    name: p.name,
    avatar: p.avatar || '/assets/avatars/avatar1.svg',
    age: p.birthdate ? calculateAge(p.birthdate) : 0,
    rank: p.rank || 'Sem rank',
    games: p.games || [],
    bio: p.bio || '',
    intents: p.intents || [],
    isSeed: false,
    likesYou: false
  })) as MatchProfile[]
}

function calculateAge(birthdate: string) {
  const birth = new Date(birthdate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

// ============ CHAT ============
export async function fetchChannels() {
  const user = useAuthStore.getState().user
  if (!user) return []

  const [global, groups, dms] = await Promise.all([
    fetchGlobalChannel(),
    fetchGroupChannels(user.username),
    fetchDMChannels(user.username)
  ])

  return [...global, ...groups, ...dms]
}

async function fetchGlobalChannel(): Promise<any[]> {
  const { data: messages } = await from('chat_messages')
    .select('*')
    .eq('scope', 'global')
    .order('created_at', { ascending: false })
    .limit(1)

  return [{
    id: 'global',
    type: 'global',
    name: 'Chat Global',
    avatar: '/assets/logo.png',
    lastMessage: messages?.[0] || null,
    unreadCount: 0
  }]
}

async function fetchGroupChannels(username: string) {
  const { data: groups } = await from('groups')
    .select('*')
    .contains('members', [username])

  if (!groups) return []

  return groups.map(g => ({
    id: `group:${g.id}`,
    type: 'group' as const,
    name: g.name,
    avatar: '/assets/icons/group.svg',
    lastMessage: null,
    unreadCount: 0,
    members: g.members
  }))
}

async function fetchDMChannels(username: string) {
  // Get matches with unread messages
  const { data: matches } = await from('matches')
    .select('match_id, messages')
    .eq('owner_username', username)

  if (!matches) return []

  return matches.map(m => {
    const lastMsg = m.messages[m.messages.length - 1]
    return {
      id: `dm:${m.match_id}`,
      type: 'dm' as const,
      name: m.match_id,
      avatar: '/assets/avatars/avatar1.svg',
      lastMessage: lastMsg ? { ...lastMsg, scope: 'dm', scope_id: m.match_id } : null,
      unreadCount: m.unread
    }
  })
}

export async function sendMessage(channelId: string, text: string) {
  const user = useAuthStore.getState().user
  if (!user) throw new Error('Não autenticado')

  const [scope, scopeId] = channelId.split(':')
  
  const message = {
    id: 'msg_' + Date.now().toString(36),
    scope: scope as 'global' | 'group' | 'dm',
    scope_id: scopeId,
    username: user.username,
    text,
    created_at: new Date().toISOString()
  }

  const { error } = await from('chat_messages').insert(message)
  if (error) throw error

  useChatStore.getState().addMessage(channelId, message as any)
  return message
}

// ============ NOTIFICATIONS ============
export async function createNotification(data: {
  type: Notification['type']
  title: string
  body: string
  actorId: string
  targetId?: string
  targetType?: Notification['targetType']
  recipientId: string
}) {
  // In production, this would be an insert to a notifications table
  // For now, we'll use the store directly for the recipient
  // In a real app, you'd have a notifications table and realtime subscription
  
  // For demo, we'll just return the notification
  return {
    id: 'notif_' + Date.now(),
    ...data,
    read: false,
    createdAt: new Date().toISOString()
  }
}

export async function fetchNotifications() {
  // In production: SELECT * FROM notifications WHERE recipient_id = user ORDER BY created_at DESC
  return useNotificationsStore.getState().items
}

// ============ GROUPS ============
export async function createGroup(data: { name: string; isPrivate: boolean; password?: string }) {
  const user = useAuthStore.getState().user
  if (!user) throw new Error('Não autenticado')

  const code = 'GC-' + Math.random().toString(36).slice(2, 8).toUpperCase()

  const { data: group, error } = await from('groups').insert({
    name: data.name,
    owner: user.username,
    members: [user.username],
    code,
    is_private: data.isPrivate,
    password: data.password || null
  }).select().single()

  if (error) throw error
  return group
}

export async function joinGroup(code: string) {
  const user = useAuthStore.getState().user
  if (!user) throw new Error('Não autenticado')

  const { data: group, error } = await from('groups')
    .select('*')
    .eq('code', code)
    .single()

  if (error || !group) throw new Error('Grupo não encontrado')

  if (group.is_private && group.password) {
    // Would need password verification
    throw new Error('Grupo privado requer senha')
  }

  const newMembers = [...group.members, user.username]
  await from('groups').update({ members: newMembers }).eq('id', group.id)
  
  return group
}

// ============ STORAGE ============
export async function uploadMedia(file: File, folder: string) {
  const user = useAuthStore.getState().user
  if (!user) throw new Error('Não autenticado')

  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const fileName = `${folder}/${user.username}/${Date.now()}.${ext}`

  const { data, error } = await supabase.storage
    .from('media')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from('media')
    .getPublicUrl(fileName)

  return publicUrl
}