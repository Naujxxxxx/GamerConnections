import { useState, useEffect, useCallback } from 'preact/hooks'
import {
  startCall,
  answerCall,
  endCall,
  toggleVideo,
  toggleAudio,
  startScreenShare,
  stopScreenShare,
  getCall,
  getLocalStream,
  getRemoteStream,
  isInCall
} from '@/services/webrtc'
import { useUIStore } from '@/stores/ui'

export function useCall() {
  const [callId, setCallId] = useState<string | null>(null)
  const [callState, setCallState] = useState<'idle' | 'calling' | 'ringing' | 'connected' | 'ended'>('idle')
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { addToast } = useUIStore()

  useEffect(() => {
    if (!callId) return
    
    const call = getCall(callId)
    if (!call) return
    
    const handleRemoteStream = (e: CustomEvent) => {
      if (e.detail.callId === callId) {
        const newStreams = new Map(remoteStreams)
        newStreams.set(e.detail.targetId, e.detail.stream)
        setRemoteStreams(newStreams)
      }
    }
    
    const handleIncomingCall = (e: CustomEvent) => {
      if (e.detail.callId === callId) {
        setCallState('ringing')
        addToast({ type: 'info', message: `Chamada de ${e.detail.from}`, duration: 0 })
      }
    }
    
    window.addEventListener('webrtc-remote-stream', handleRemoteStream as EventListener)
    window.addEventListener('webrtc-incoming-call', handleIncomingCall as EventListener)
    
    return () => {
      window.removeEventListener('webrtc-remote-stream', handleRemoteStream as EventListener)
      window.removeEventListener('webrtc-incoming-call', handleIncomingCall as EventListener)
    }
  }, [callId, remoteStreams])

  const call = useCallback(async (targetId: string, type: 'audio' | 'video' = 'video') => {
    setError(null)
    try {
      const id = await startCall(targetId, type)
      setCallId(id)
      setCallState('calling')
      
      const call = getCall(id)
      if (call?.localStream) setLocalStream(call.localStream)
      
      return id
    } catch (err: any) {
      setError(err.message)
      addToast({ type: 'error', message: 'Falha ao iniciar chamada' })
      throw err
    }
  }, [])

  const answer = useCallback(async (incomingCallId: string, accept: boolean) => {
    if (!accept) {
      endCall(incomingCallId)
      return
    }
    
    try {
      await answerCall(incomingCallId, true)
      setCallId(incomingCallId)
      setCallState('connected')
      
      const call = getCall(incomingCallId)
      if (call?.localStream) setLocalStream(call.localStream)
    } catch (err: any) {
      setError(err.message)
      addToast({ type: 'error', message: 'Falha ao atender' })
    }
  }, [])

  const hangup = useCallback(() => {
    if (callId) {
      endCall(callId)
      setCallId(null)
      setCallState('ended')
      setLocalStream(null)
      setRemoteStreams(new Map())
      setIsScreenSharing(false)
    }
  }, [callId])

  const setVideoEnabled = useCallback(async (enabled: boolean) => {
    if (callId) {
      await toggleVideo(callId, enabled)
    }
  }, [callId])

  const setAudioEnabled = useCallback(async (enabled: boolean) => {
    if (callId) {
      await toggleAudio(callId, enabled)
    }
  }, [callId])

  const shareScreen = useCallback(async () => {
    if (callId) {
      await startScreenShare(callId)
      setIsScreenSharing(true)
    }
  }, [callId])

  const stopShareScreen = useCallback(async () => {
    if (callId) {
      await stopScreenShare(callId)
      setIsScreenSharing(false)
    }
  }, [callId])

  return {
    callId,
    callState,
    localStream,
    remoteStreams: Array.from(remoteStreams.entries()),
    isScreenSharing,
    error,
    isInCall: callState !== 'idle' && callState !== 'ended',
    call,
    answer,
    hangup,
    setVideoEnabled,
    setAudioEnabled,
    shareScreen,
    stopShareScreen
  }
}