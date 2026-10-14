import { sendWebRTCSignal, subscribeToWebRTCSignaling, unsubscribe } from './realtime'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'

export type CallType = 'audio' | 'video'
export type CallState = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended'

export interface Call {
  id: string
  type: CallType
  state: CallState
  participants: string[]
  localStream?: MediaStream
  remoteStreams: Map<string, MediaStream>
  peerConnections: Map<string, RTCPeerConnection>
  screenStream?: MediaStream
  isScreenSharing: boolean
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
]

const calls = new Map<string, Call>()

function generateCallId() {
  return 'call_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function createPeerConnection(callId: string, targetId: string): RTCPeerConnection {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
  
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      sendWebRTCSignal(callId, {
        type: 'ice-candidate',
        from: useAuthStore.getState().user!.username,
        to: targetId,
        payload: event.candidate.toJSON(),
        callId
      })
    }
  }
  
  pc.ontrack = (event) => {
    const call = calls.get(callId)
    if (call) {
      call.remoteStreams.set(targetId, event.streams[0])
      window.dispatchEvent(new CustomEvent('webrtc-remote-stream', { 
        detail: { callId, targetId, stream: event.streams[0] } 
      }))
    }
  }
  
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
      endCall(callId)
    }
  }
  
  return pc
}

export async function startCall(targetId: string, type: CallType = 'video'): Promise<string> {
  const callId = generateCallId()
  const user = useAuthStore.getState().user!
  
  try {
    // Get user media
    const constraints: MediaStreamConstraints = {
      audio: true,
      video: type === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false
    }
    
    const localStream = await navigator.mediaDevices.getUserMedia(constraints)
    
    const call: Call = {
      id: callId,
      type,
      state: 'calling',
      participants: [user.username, targetId],
      localStream,
      remoteStreams: new Map(),
      peerConnections: new Map()
    }
    
    // Create peer connection
    const pc = createPeerConnection(callId, targetId)
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream))
    call.peerConnections.set(targetId, pc)
    
    // Create offer
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    
    // Send offer via signaling
    sendWebRTCSignal(callId, {
      type: 'offer',
      from: user.username,
      to: targetId,
      payload: offer,
      callType: type,
      callId
    })
    
    // Subscribe to signaling
    subscribeToWebRTCSignaling(callId)
    
    // Listen for signaling responses
    const handleSignal = (event: CustomEvent) => {
      const signal = event.detail
      if (signal.callId !== callId) return
      handleIncomingSignal(signal)
    }
    
    window.addEventListener('webrtc-signal', handleSignal as EventListener)
    
    // Store cleanup
    call.peerConnections.set('__cleanup', { handleSignal } as any)
    calls.set(callId, call)
    
    useUIStore.getState().addToast({
      type: 'info',
      message: `Chamando ${targetId}...`,
      duration: 0
    })
    
    return callId
  } catch (error) {
    console.error('Failed to start call:', error)
    throw error
  }
}

export async function answerCall(callId: string, accept: boolean) {
  const call = calls.get(callId)
  if (!call) return
  
  if (!accept) {
    sendWebRTCSignal(callId, {
      type: 'reject',
      from: useAuthStore.getState().user!.username,
      to: call.participants.find(p => p !== useAuthStore.getState().user!.username)!,
      callId
    })
    endCall(callId)
    return
  }
  
  try {
    const user = useAuthStore.getState().user!
    const constraints: MediaStreamConstraints = {
      audio: true,
      video: call.type === 'video'
    }
    
    const localStream = await navigator.mediaDevices.getUserMedia(constraints)
    call.localStream = localStream
    call.state = 'connected'
    
    // Create peer connections for all participants
    for (const participantId of call.participants) {
      if (participantId === user.username) continue
      
      const pc = createPeerConnection(callId, participantId)
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream))
      call.peerConnections.set(participantId, pc)
    }
    
    useUIStore.getState().addToast({
      type: 'success',
      message: 'Chamada conectada',
      duration: 3000
    })
  } catch (error) {
    console.error('Failed to answer call:', error)
    endCall(callId)
  }
}

async function handleIncomingSignal(signal: any) {
  const user = useAuthStore.getState().user!
  const call = calls.get(signal.callId)
  if (!call) return
  
  switch (signal.type) {
    case 'offer': {
      // Incoming call
      call.state = 'ringing'
      call.type = signal.callType
      call.participants = [signal.from, user.username]
      
      // Notify UI
      window.dispatchEvent(new CustomEvent('webrtc-incoming-call', { 
        detail: { callId: signal.callId, from: signal.from, type: signal.callType } 
      }))
      break
    }
    
    case 'answer': {
      const pc = call.peerConnections.get(signal.from)
      if (pc && signal.payload) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.payload))
      }
      break
    }
    
    case 'ice-candidate': {
      const pc = call.peerConnections.get(signal.from)
      if (pc && signal.payload) {
        await pc.addIceCandidate(new RTCIceCandidate(signal.payload))
      }
      break
    }
    
    case 'hangup':
    case 'reject': {
      endCall(signal.callId)
      break
    }
  }
}

export async function toggleVideo(callId: string, enabled: boolean) {
  const call = calls.get(callId)
  if (!call || !call.localStream) return
  
  const videoTrack = call.localStream.getVideoTracks()[0]
  if (videoTrack) {
    videoTrack.enabled = enabled
  } else if (enabled) {
    // Add video track
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    const newVideoTrack = stream.getVideoTracks()[0]
    call.localStream.addTrack(newVideoTrack)
    
    // Renegotiate
    for (const [targetId, pc] of call.peerConnections) {
      if (targetId.startsWith('__')) continue
      const sender = pc.getSenders().find(s => s.track?.kind === 'video')
      if (sender) {
        await sender.replaceTrack(newVideoTrack)
      } else {
        pc.addTrack(newVideoTrack, call.localStream)
      }
    }
  }
}

export async function toggleAudio(callId: string, enabled: boolean) {
  const call = calls.get(callId)
  if (!call || !call.localStream) return
  
  const audioTrack = call.localStream.getAudioTracks()[0]
  if (audioTrack) {
    audioTrack.enabled = enabled
  }
}

export async function startScreenShare(callId: string) {
  const call = calls.get(callId)
  if (!call || call.isScreenSharing) return
  
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: 'always' },
      audio: true
    })
    
    call.screenStream = screenStream
    call.isScreenSharing = true
    
    // Replace video track with screen track
    const screenTrack = screenStream.getVideoTracks()[0]
    
    for (const [targetId, pc] of call.peerConnections) {
      if (targetId.startsWith('__')) continue
      const sender = pc.getSenders().find(s => s.track?.kind === 'video')
      if (sender) {
        await sender.replaceTrack(screenTrack)
      }
    }
    
    // Handle screen share ended by user
    screenTrack.onended = () => {
      stopScreenShare(callId)
    }
    
    useUIStore.getState().addToast({
      type: 'info',
      message: 'Compartilhamento de tela iniciado',
      duration: 3000
    })
  } catch (error) {
    console.error('Failed to start screen share:', error)
  }
}

export async function stopScreenShare(callId: string) {
  const call = calls.get(callId)
  if (!call || !call.isScreenSharing) return
  
  if (call.screenStream) {
    call.screenStream.getTracks().forEach(track => track.stop())
    call.screenStream = undefined
  }
  
  call.isScreenSharing = false
  
  // Restore camera if available
  if (call.localStream) {
    const videoTrack = call.localStream.getVideoTracks()[0]
    if (videoTrack) {
      for (const [targetId, pc] of call.peerConnections) {
        if (targetId.startsWith('__')) continue
        const sender = pc.getSenders().find(s => s.track?.kind === 'video')
        if (sender) {
          await sender.replaceTrack(videoTrack)
        }
      }
    }
  }
  
  useUIStore.getState().addToast({
    type: 'info',
    message: 'Compartilhamento de tela encerrado',
    duration: 2000
  })
}

export function endCall(callId: string) {
  const call = calls.get(callId)
  if (!call) return
  
  // Stop all tracks
  call.localStream?.getTracks().forEach(track => track.stop())
  call.screenStream?.getTracks().forEach(track => track.stop())
  call.remoteStreams.forEach(stream => stream.getTracks().forEach(track => track.stop()))
  
  // Close peer connections
  call.peerConnections.forEach((pc, key) => {
    if (!key.startsWith('__')) {
      pc.close()
    }
  })
  
  // Cleanup event listeners
  const cleanup = call.peerConnections.get('__cleanup')
  if (cleanup) {
    window.removeEventListener('webrtc-signal', cleanup.handleSignal as EventListener)
  }
  
  // Unsubscribe from signaling
  unsubscribe(`webrtc-${callId}`)
  
  calls.delete(callId)
  
  useUIStore.getState().addToast({
    type: 'info',
    message: 'Chamada encerrada',
    duration: 2000
  })
}

export function getCall(callId: string): Call | undefined {
  return calls.get(callId)
}

export function getActiveCalls(): Call[] {
  return Array.from(calls.values())
}

export function getLocalStream(callId: string): MediaStream | undefined {
  return calls.get(callId)?.localStream
}

export function getRemoteStream(callId: string, targetId: string): MediaStream | undefined {
  return calls.get(callId)?.remoteStreams.get(targetId)
}

export function isInCall(): boolean {
  return calls.size > 0
}