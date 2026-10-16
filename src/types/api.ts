export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface ApiError {
  code: string
  message: string
  details?: string
}

import type { Profile } from '@/types/database'

export interface AuthResponse {
  user: Profile | null
  session: Session | null
  error?: ApiError
}

export interface Session {
  access_token: string
  refresh_token: string
  expires_at: number
  token_type: 'bearer'
  user: {
    id: string
    email: string
    user_metadata: {
      username?: string
      full_name?: string
      avatar_url?: string
    }
  }
}

export interface SignUpData {
  email: string
  password: string
  username: string
  name: string
  birthdate: string
  gender: 'M' | 'F'
  lookingFor: 'M' | 'F' | 'both'
  intents: string[]
  avatar?: string
}

export interface SignInData {
  identifier: string // username or email
  password: string
}

export interface UpdateProfileData {
  name?: string
  bio?: string
  avatar?: string
  banner?: string
  games?: string[]
  hobbies?: string[]
  gender?: 'M' | 'F' | ''
  lookingFor?: 'M' | 'F' | 'both'
  intents?: string[]
  badgeColor?: string
  theme?: number
}

export interface CreatePostData {
  type: 'photo' | 'video'
  src: string
  caption?: string
  game?: string
}

export interface CreateCommentData {
  postId: string
  text: string
}

export interface CreateGroupData {
  name: string
  code: string
  isPrivate: boolean
  password?: string
}

export interface MatchAction {
  type: 'like' | 'pass' | 'superlike'
  targetId: string
}

export interface CallSignalData {
  type: 'offer' | 'answer' | 'ice-candidate' | 'call' | 'hangup' | 'reject'
  from: string
  to: string
  payload?: RTCSessionDescriptionInit | RTCIceCandidateInit
  callType: 'audio' | 'video'
  callId: string
}