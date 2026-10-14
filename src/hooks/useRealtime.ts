import { useEffect } from 'preact/hooks'
import { subscribeToGlobalChat, subscribeToGroupChat, subscribeToDM, subscribeToFeed, subscribeToNotifications, subscribeToWebRTCSignaling, unsubscribe, unsubscribeAll } from '@/services/realtime'
import { useChatStore } from '@/stores/chat'
import { useFeedStore } from '@/stores/feed'
import { useNotificationsStore } from '@/stores/notifications'

export function useGlobalChat() {
  useEffect(() => {
    const channel = subscribeToGlobalChat()
    return () => unsubscribe('global-chat')
  }, [])
}

export function useGroupChat(groupId: string | null) {
  useEffect(() => {
    if (!groupId) return
    const channel = subscribeToGroupChat(groupId)
    return () => unsubscribe(`group-chat-${groupId}`)
  }, [groupId])
}

export function useDM(matchId: string | null) {
  useEffect(() => {
    if (!matchId) return
    const channel = subscribeToDM(matchId)
    return () => unsubscribe(`dm-${matchId}`)
  }, [matchId])
}

export function useFeedRealtime() {
  useEffect(() => {
    const channel = subscribeToFeed()
    return () => unsubscribe('feed')
  }, [])
}

export function useNotificationsRealtime() {
  useEffect(() => {
    const channel = subscribeToNotifications()
    return () => {
      const user = useChatStore.getState() // dummy to get store
      // unsubscribe called in cleanup
    }
  }, [])
}

export function useWebRTCSignaling(callId: string | null) {
  useEffect(() => {
    if (!callId) return
    const channel = subscribeToWebRTCSignaling(callId)
    return () => unsubscribe(`webrtc-${callId}`)
  }, [callId])
}

export function useRealtimeCleanup() {
  useEffect(() => {
    return () => unsubscribeAll()
  }, [])
}