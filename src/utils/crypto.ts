/**
 * Client-side crypto utilities
 * Note: Real password hashing should happen server-side via Edge Function
 * This is for local operations only
 */

export async function hashPassword(password: string): Promise<string> {
  const salted = 'gamerconnections::' + password
  const encoder = new TextEncoder()
  const data = encoder.encode(salted)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return 'sha256$' + hashHex
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash.startsWith('sha256$')) return false
  const computed = await hashPassword(password)
  return computed === hash
}

export function generateSecureToken(length = 32): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

export function generateId(prefix = ''): string {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

export async function encryptData(data: string, password: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  )
  
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  )
  
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
  combined.set(salt)
  combined.set(iv, salt.length)
  combined.set(new Uint8Array(encrypted), salt.length + iv.length)
  
  return btoa(String.fromCharCode(...combined))
}

export async function decryptData(encryptedData: string, password: string): Promise<string> {
  const combined = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)))
  const salt = combined.slice(0, 16)
  const iv = combined.slice(16, 28)
  const data = combined.slice(28)
  
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  )
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )
  
  return new TextDecoder().decode(decrypted)
}