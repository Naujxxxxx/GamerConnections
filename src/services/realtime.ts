import { supabase, createRealtimeChannel } from '@/config/supabase'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import { useNotificationsStore } from '@/stores/notifications'
import { useFeedStore } from '@/stores/feed'
import type { ChatMessage, Notification } from '@/types/ui'

let channels: Map<string, ReturnType<typeof createRealtimeChannel>> = new Map()

export function subscribeToGlobalChat() {
  const channel = createRealtimeChannel('global-chat')
  
  channel
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_messages',
      filter: 'scope=eq.global'
    }, (payload) => {
      const message = payload.new as ChatMessage
      useChatStore.getState().onMessageInsert(message)
    })
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'chat_messages',
      filter: 'scope=eq.global'
    }, (payload) => {
      const message = payload.new as ChatMessage
      useChatStore.getState().onMessageUpdate(message)
    })
    .on('postgres_changes', {
      event: 'DELETE',
      schema: 'public',
      table: 'chat_messages',
      filter: 'scope=eq.global'
    }, (payload) => {
      const message = payload.old as ChatMessage
      useChatStore.getState().onMessageDelete('global', message.id)
    })
    .subscribe()

  channels.set('global-chat', channel)
  return channel
}

export function subscribeToGroupChat(groupId: string) {
  const channelName = `group-chat-${groupId}`
  const channel = createRealtimeChannel(channelName)
  
  channel
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_messages',
      filter: `scope=eq.group,scope_id=eq.${groupId}`
    }, (payload) => {
      const message = payload.new as ChatMessage
      const channelId = `group:${groupId}`
      useChatStore.getState().onMessageInsert(message)
    })
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'chat_messages',
      filter: `scope=eq.group,scope_id=eq.${groupId}`
    }, (payload) => {
      const message = payload.new as ChatMessage
      useChatStore.getState().onMessageUpdate(message)
    })
    .subscribe()

  channels.set(channelName, channel)
  return channel
}

export function subscribeToDM(matchId: string) {
  const channelName = `dm-${matchId}`
  const channel = createRealtimeChannel(channelName)
  
  channel
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_messages',
      filter: `scope=eq.dm,scope_id=eq.${matchId}`
    }, (payload) => {
      const message = payload.new as ChatMessage
      const channelId = `dm:${matchId}`
      useChatStore.getState().onMessageInsert(message)
    })
    .subscribe()

  channels.set(channelName, channel)
  return channel
}

export function subscribeToFeed() {
  const channel = createRealtimeChannel('feed')
  
  channel
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'posts'
    }, (payload) => {
      // Handle new post
      console.log('New post:', payload.new)
    })
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'post_likes'
    }, (payload) => {
      const like = payload.new
      useFeedStore.getState().onLikeInsert(like.post_id, like.username)
    })
    .on('postgres_changes', {
      event: 'DELETE',
      schema: 'public',
      table: 'post_likes'
    }, (payload) => {
      const like = payload.old
      useFeedStore.getState().onLikeDelete(like.post_id, like.username)
    })
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'comments'
    }, (payload) => {
      const comment = payload.new
      useFeedStore.getState().onCommentInsert(comment as any)
    })
    .subscribe()

  channels.set('feed', channel)
  return channel
}

export function subscribeToNotifications() {
  const user = useAuthStore.getState().user
  if (!user) return null

  const channel = createRealtimeChannel(`notifications-${user.username}`)
  
  channel
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `recipient_id=eq.${user.username}`
    }, (payload) => {
      const notification = payload.new as Notification
      useNotificationsStore.getState().onNotificationInsert(notification)
    })
    .subscribe()

  channels.set(`notifications-${user.username}`, channel)
  return channel
}

export function subscribeToWebRTCSignaling(callId: string) {
  const channelName = `webrtc-${callId}`
  const channel = createRealtimeChannel(channelName)
  
  channel
    .on('broadcast', { event: 'signal' }, ({ payload }) => {
      // Handle WebRTC signaling
      window.dispatchEvent(new CustomEvent('webrtc-signal', { detail: payload }))
    })
    .subscribe()

  channels.set(channelName, channel)
  return channel
}

export function unsubscribe(channelName: string) {
  const channel = channels.get(channelName)
  if (channel) {
    supabase.removeChannel(channel)
    channels.delete(channelName)
  }
}

export function unsubscribeAll() {
  channels.forEach((channel) => {
    supabase.removeChannel(channel)
  })
  channels.clear()
}

export function sendWebRTCSignal(callId: string, signal: any) {
  const channelName = `webrtc-${callId}`
  const channel = channels.get(channelName)
  if (channel) {
    channel.send({
      type: 'broadcast',
      event: 'signal',
      payload: signal
    })
  }
}

// Presence for online status
export function subscribeToPresence(userIds: string[]) {
  const channel = createRealtimeChannel('presence')
  
  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      console.log('Presence sync:', state)
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('User joined:', key, newPresences)
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('User left:', key, leftPresences)
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user_id: useAuthStore.getState().user?.username, online: true })
      }
    })

  channels.set('presence', channel)
  return channel
}

export function updatePresence(status: 'online' | 'away' | 'offline') {
  const channel = channels.get('presence')
  if (channel) {
    channel.track({ user_id: useAuthStore.getState().user?.username, online: status === 'online' })
  }
}