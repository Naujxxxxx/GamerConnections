export { renderApp } from './App'
export { renderDiscover } from './Discover'
export { renderFeed } from './Feed'
export { renderChat } from './Chat'
export { renderMatches } from './Matches'
export { renderProfile } from './Profile'

// Re-export types
export type { FeedPost, FeedComment, ChatChannel, MatchProfile, Notification, Toast, ModalState, SearchResult } from '@/types/ui'
export type { Profile, Post, Comment, Group, ChatMessage } from '@/types/database'