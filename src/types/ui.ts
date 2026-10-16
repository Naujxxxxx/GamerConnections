import type { Profile, Post, ChatMessage } from '@/types/database'

export interface UserProfile extends Profile {
  age?: number
  rank?: string
  level?: string
  isOnline?: boolean
  lastSeen?: string
}

export interface FeedPost extends Post {
  author: UserProfile
  likesCount: number
  commentsCount: number
  isLiked: boolean
  comments?: FeedComment[]
}

export interface FeedComment extends Comment {
  author: Pick<UserProfile, 'username' | 'name' | 'avatar' | 'badge_color'>
}

export interface ChatChannel {
  id: string
  type: 'global' | 'group' | 'dm'
  name: string
  avatar?: string
  lastMessage?: ChatMessage
  unreadCount: number
  members?: UserProfile[]
}

export interface MatchProfile {
  id: string
  username: string
  name: string
  avatar: string
  age: number
  rank: string
  games: string[]
  bio: string
  intents: string[]
  isSeed: boolean
  likesYou: boolean
}

export interface Notification {
  id: string
  type: 'like' | 'comment' | 'follow' | 'match' | 'mention' | 'message' | 'system'
  title: string
  body: string
  actor: Pick<UserProfile, 'username' | 'name' | 'avatar' | 'badge_color'>
  targetId?: string
  targetType?: 'post' | 'profile' | 'chat' | 'match'
  read: boolean
  createdAt: string
}

export interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  duration?: number
}

export interface ModalState {
  isOpen: boolean
  type: string | null
  data?: unknown
}

export interface SearchResult {
  type: 'user' | 'post' | 'hashtag' | 'group'
  id: string
  title: string
  subtitle?: string
  avatar?: string
  count?: number
}