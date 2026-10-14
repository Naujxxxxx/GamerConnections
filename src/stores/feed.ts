import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Post, Comment, Profile } from '@/types/database'
import type { FeedPost, FeedComment } from '@/types/ui'

interface FeedState {
  posts: FeedPost[]
  isLoading: boolean
  hasMore: boolean
  cursor: string | null
  
  // Optimistic updates
  likePost: (postId: string, username: string) => void
  unlikePost: (postId: string, username: string) => void
  addComment: (postId: string, comment: FeedComment) => void
  deleteComment: (postId: string, commentId: string) => void
  addPost: (post: FeedPost) => void
  deletePost: (postId: string) => void
  setPosts: (posts: FeedPost[]) => void
  appendPosts: (posts: FeedPost[]) => void
  setLoading: (loading: boolean) => void
  setHasMore: (hasMore: boolean) => void
  setCursor: (cursor: string | null) => void
  
  // Realtime
  onPostInsert: (post: FeedPost) => void
  onPostUpdate: (post: FeedPost) => void
  onPostDelete: (postId: string) => void
  onLikeInsert: (postId: string, username: string) => void
  onLikeDelete: (postId: string, username: string) => void
  onCommentInsert: (comment: FeedComment) => void
  onCommentDelete: (postId: string, commentId: string) => void
}

export const useFeedStore = create<FeedState>()(
  persist(
    (set, get) => ({
      posts: [],
      isLoading: false,
      hasMore: true,
      cursor: null,
      
      likePost: (postId, username) => set((state) => ({
        posts: state.posts.map(p => 
          p.id === postId 
            ? { ...p, likesCount: p.likesCount + 1, isLiked: p.author.username === username || p.isLiked }
            : p
        )
      })),
      
      unlikePost: (postId, username) => set((state) => ({
        posts: state.posts.map(p => 
          p.id === postId 
            ? { ...p, likesCount: Math.max(0, p.likesCount - 1), isLiked: false }
            : p
        )
      })),
      
      addComment: (postId, comment) => set((state) => ({
        posts: state.posts.map(p => 
          p.id === postId 
            ? { ...p, commentsCount: p.commentsCount + 1, comments: [...(p.comments || []), comment] }
            : p
        )
      })),
      
      deleteComment: (postId, commentId) => set((state) => ({
        posts: state.posts.map(p => 
          p.id === postId 
            ? { ...p, commentsCount: Math.max(0, p.commentsCount - 1), comments: p.comments?.filter(c => c.id !== commentId) }
            : p
        )
      })),
      
      addPost: (post) => set((state) => ({
        posts: [post, ...state.posts]
      })),
      
      deletePost: (postId) => set((state) => ({
        posts: state.posts.filter(p => p.id !== postId)
      })),
      
      setPosts: (posts) => set({ posts }),
      appendPosts: (posts) => set((state) => ({ posts: [...state.posts, ...posts] })),
      setLoading: (loading) => set({ isLoading: loading }),
      setHasMore: (hasMore) => set({ hasMore }),
      setCursor: (cursor) => set({ cursor }),
      
      // Realtime handlers
      onPostInsert: (post) => set((state) => ({
        posts: state.posts.some(p => p.id === post.id) ? state.posts : [post, ...state.posts]
      })),
      
      onPostUpdate: (post) => set((state) => ({
        posts: state.posts.map(p => p.id === post.id ? post : p)
      })),
      
      onPostDelete: (postId) => set((state) => ({
        posts: state.posts.filter(p => p.id !== postId)
      })),
      
      onLikeInsert: (postId, username) => {
        const currentUser = useAuthStore.getState().user?.username
        if (currentUser === username) {
          get().likePost(postId, username)
        } else {
          set((state) => ({
            posts: state.posts.map(p => 
              p.id === postId ? { ...p, likesCount: p.likesCount + 1 } : p
            )
          }))
        }
      },
      
      onLikeDelete: (postId, username) => {
        const currentUser = useAuthStore.getState().user?.username
        if (currentUser === username) {
          get().unlikePost(postId, username)
        } else {
          set((state) => ({
            posts: state.posts.map(p => 
              p.id === postId ? { ...p, likesCount: Math.max(0, p.likesCount - 1) } : p
            )
          }))
        }
      },
      
      onCommentInsert: (comment) => set((state) => ({
        posts: state.posts.map(p => 
          p.id === comment.post_id 
            ? { ...p, commentsCount: p.commentsCount + 1, comments: [...(p.comments || []), comment] }
            : p
        )
      })),
      
      onCommentDelete: (postId, commentId) => set((state) => ({
        posts: state.posts.map(p => 
          p.id === postId 
            ? { ...p, commentsCount: Math.max(0, p.commentsCount - 1), comments: p.comments?.filter(c => c.id !== commentId) }
            : p
        )
      }))
    }),
    {
      name: 'gc_feed_v2',
      partialize: (state) => ({ posts: state.posts.slice(0, 50) }) // Keep last 50
    }
  )
)