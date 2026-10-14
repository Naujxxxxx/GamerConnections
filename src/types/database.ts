// Generated from Supabase schema - run: npx supabase gen types typescript --project-id YOUR_PROJECT > src/types/database.ts

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          username: string
          name: string
          email: string
          birthdate: string | null
          avatar: string | null
          password_hash: string
          gender: string | null
          looking_for: string | null
          intents: string[] | null
          photo: string | null
          gif_avatar: string | null
          banner: string | null
          theme: number | null
          bg_img: string | null
          name_color: string | null
          name_font: string | null
          badge_color: string | null
          bio: string | null
          hobbies: string[] | null
          games: string[] | null
          created_at: string
          has_beta: boolean | null
          has_founder: boolean | null
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      posts: {
        Row: {
          id: string
          author_username: string
          type: 'photo' | 'video'
          src: string
          caption: string | null
          game: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['posts']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['posts']['Insert']>
      }
      comments: {
        Row: {
          id: string
          post_id: string
          username: string
          text: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['comments']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['comments']['Insert']>
      }
      post_likes: {
        Row: {
          post_id: string
          username: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['post_likes']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['post_likes']['Insert']>
      }
      follows: {
        Row: {
          follower: string
          following: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['follows']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['follows']['Insert']>
      }
      chat_messages: {
        Row: {
          id: string
          scope: 'global' | 'group' | 'dm'
          scope_id: string
          username: string
          text: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['chat_messages']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['chat_messages']['Insert']>
      }
      groups: {
        Row: {
          id: string
          name: string
          owner: string
          members: string[]
          code: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['groups']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['groups']['Insert']>
      }
      matches: {
        Row: {
          owner_username: string
          match_id: string
          unread: number
          messages: Json
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['matches']['Row'], 'updated_at'>
        Update: Partial<Database['public']['Tables']['matches']['Insert']>
      }
      friend_requests: {
        Row: {
          to_username: string
          from_username: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['friend_requests']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['friend_requests']['Insert']>
      }
      wall: {
        Row: {
          id: string
          profile_username: string
          from_username: string
          text: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['wall']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['wall']['Insert']>
      }
      highlights: {
        Row: {
          id: string
          username: string
          label: string
          img_url: string
          position: number
        }
        Insert: Omit<Database['public']['Tables']['highlights']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['highlights']['Insert']>
      }
      medals_equipped: {
        Row: {
          username: string
          medal_id: string
          unlocked_at: string
        }
        Insert: Omit<Database['public']['Tables']['medals_equipped']['Row'], 'unlocked_at'>
        Update: Partial<Database['public']['Tables']['medals_equipped']['Insert']>
      }
      dogtags_owned: {
        Row: {
          username: string
          dogtag_id: string
          text: string
        }
        Insert: Omit<Database['public']['Tables']['dogtags_owned']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['dogtags_owned']['Insert']>
      }
      subscriptions: {
        Row: {
          username: string
          plan: 'free' | 'vip' | 'elite' | 'ceo'
          label: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['subscriptions']['Row'], 'updated_at'>
        Update: Partial<Database['public']['Tables']['subscriptions']['Insert']>
      }
      app_state: {
        Row: {
          username: string
          seen: string[]
          likes_date: string
          likes_count: number
          super_date: string
          super_count: number
        }
        Insert: Omit<Database['public']['Tables']['app_state']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['app_state']['Insert']>
      }
      blocked: {
        Row: {
          username: string
          blocked_key: string
          blocked_name: string
        }
        Insert: Omit<Database['public']['Tables']['blocked']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['blocked']['Insert']>
      }
      custom_medals: {
        Row: {
          id: string
          name: string
          icon: string
          rule: string
          n: number
        }
        Insert: Omit<Database['public']['Tables']['custom_medals']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['custom_medals']['Insert']>
      }
      blocked_tags: {
        Row: {
          tag: string
        }
        Insert: Database['public']['Tables']['blocked_tags']['Row']
        Update: Partial<Database['public']['Tables']['blocked_tags']['Insert']>
      }
      orders: {
        Row: {
          code: string
          username: string
          items: Json
          total: number
        }
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['orders']['Insert']>
      }
      medal_dates: {
        Row: {
          username: string
          medal_id: string
          unlocked_at: string
        }
        Insert: Omit<Database['public']['Tables']['medal_dates']['Row'], 'unlocked_at'>
        Update: Partial<Database['public']['Tables']['medal_dates']['Insert']>
      }
      redeemed_codes: {
        Row: {
          code: string
          used_by: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['redeemed_codes']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['redeemed_codes']['Insert']>
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Post = Database['public']['Tables']['posts']['Row']
export type Comment = Database['public']['Tables']['comments']['Row']
export type Like = Database['public']['Tables']['post_likes']['Row']
export type Follow = Database['public']['Tables']['follows']['Row']
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row']
export type Group = Database['public']['Tables']['groups']['Row']
export type Match = Database['public']['Tables']['matches']['Row']
export type FriendRequest = Database['public']['Tables']['friend_requests']['Row']
export type WallPost = Database['public']['Tables']['wall']['Row']
export type Highlight = Database['public']['Tables']['highlights']['Row']
export type Medal = Database['public']['Tables']['medals_equipped']['Row']
export type Dogtag = Database['public']['Tables']['dogtags_owned']['Row']
export type Subscription = Database['public']['Tables']['subscriptions']['Row']
export type AppState = Database['public']['Tables']['app_state']['Row']
export type Blocked = Database['public']['Tables']['blocked']['Row']
export type CustomMedal = Database['public']['Tables']['custom_medals']['Row']
export type Order = Database['public']['Tables']['orders']['Row']
export type MedalDate = Database['public']['Tables']['medal_dates']['Row']
export type RedeemedCode = Database['public']['Tables']['redeemed_codes']['Row']