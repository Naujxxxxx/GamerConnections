import { supabase } from '@/config/supabase'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'

export interface UploadOptions {
  folder: string
  maxSize?: number
  allowedTypes?: string[]
  onProgress?: (progress: number) => void
}

export async function uploadFile(file: File, options: UploadOptions): Promise<string> {
  const user = useAuthStore.getState().user
  if (!user) throw new Error('Não autenticado')
  
  // Validate file size
  const maxSize = options.maxSize || 50 * 1024 * 1024 // 50MB default
  if (file.size > maxSize) {
    throw new Error(`Arquivo muito grande. Máximo: ${formatFileSize(maxSize)}`)
  }
  
  // Validate file type
  if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
    throw new Error(`Tipo de arquivo não permitido: ${file.type}`)
  }
  
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const fileName = `${options.folder}/${user.username}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
  
  return new Promise((resolve, reject) => {
    const upload = supabase.storage
      .from('media')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    // Note: Supabase JS v2 doesn't expose progress events directly
    // For progress, you'd need to use the lower-level upload or a library
    
    upload.then(({ data, error }) => {
      if (error) {
        reject(error)
        return
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(fileName)
      
      resolve(publicUrl)
    }).catch(reject)
  })
}

export async function uploadImage(file: File, folder: string = 'images'): Promise<string> {
  return uploadFile(file, {
    folder,
    maxSize: 10 * 1024 * 1024, // 10MB for images
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  })
}

export async function uploadVideo(file: File, folder: string = 'videos'): Promise<string> {
  return uploadFile(file, {
    folder,
    maxSize: 50 * 1024 * 1024, // 50MB for videos
    allowedTypes: ['video/mp4', 'video/webm', 'video/quicktime']
  })
}

export async function uploadAvatar(file: File): Promise<string> {
  return uploadFile(file, {
    folder: 'avatars',
    maxSize: 5 * 1024 * 1024, // 5MB for avatars
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  })
}

export async function uploadBanner(file: File): Promise<string> {
  return uploadFile(file, {
    folder: 'banners',
    maxSize: 10 * 1024 * 1024, // 10MB for banners
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  })
}

export async function deleteFile(url: string): Promise<void> {
  // Extract file path from public URL
  const urlObj = new URL(url)
  const pathParts = urlObj.pathname.split('/')
  const bucketIndex = pathParts.indexOf('media')
  if (bucketIndex === -1) return
  
  const filePath = pathParts.slice(bucketIndex + 1).join('/')
  
  const { error } = await supabase.storage
    .from('media')
    .remove([filePath])
  
  if (error) throw error
}

export function getPublicUrl(path: string): string {
  const { data } = supabase.storage.from('media').getPublicUrl(path)
  return data.publicUrl
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function getFileType(file: File): 'image' | 'video' | 'other' {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  return 'other'
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  const maxSize = 10 * 1024 * 1024
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Tipo de imagem não permitido. Use JPG, PNG, GIF ou WebP.' }
  }
  if (file.size > maxSize) {
    return { valid: false, error: `Imagem muito grande. Máximo: ${formatFileSize(maxSize)}` }
  }
  return { valid: true }
}

export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime']
  const maxSize = 50 * 1024 * 1024
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Tipo de vídeo não permitido. Use MP4, WebM ou MOV.' }
  }
  if (file.size > maxSize) {
    return { valid: false, error: `Vídeo muito grande. Máximo: ${formatFileSize(maxSize)}` }
  }
  return { valid: true }
}