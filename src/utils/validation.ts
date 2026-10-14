import { z } from 'zod'

export const usernameSchema = z.string()
  .min(3, 'Mínimo 3 caracteres')
  .max(20, 'Máximo 20 caracteres')
  .regex(/^[a-zA-Z0-9_]+$/, 'Apenas letras, números e _')

export const emailSchema = z.string()
  .email('Email inválido')
  .max(100)

export const passwordSchema = z.string()
  .min(8, 'Mínimo 8 caracteres')
  .max(128)
  .regex(/[A-Z]/, 'Pelo menos uma maiúscula')
  .regex(/[a-z]/, 'Pelo menos uma minúscula')
  .regex(/[0-9]/, 'Pelo menos um número')

export const nameSchema = z.string()
  .min(2, 'Muito curto')
  .max(50, 'Muito longo')
  .regex(/^[\p{L}\s'-]+$/u, 'Caracteres inválidos')

export const bioSchema = z.string()
  .max(500, 'Máximo 500 caracteres')
  .optional()

export const captionSchema = z.string()
  .max(2000, 'Máximo 2000 caracteres')
  .optional()

export const signUpSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  name: nameSchema,
  birthdate: z.string().refine(date => {
    const birth = new Date(date)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age >= 13
  }, 'Você precisa ter pelo menos 13 anos'),
  gender: z.enum(['M', 'F']),
  lookingFor: z.enum(['M', 'F', 'both']),
  intents: z.array(z.string()).min(1, 'Escolha pelo menos um interesse'),
  terms: z.literal(true, { errorMap: () => ({ message: 'Você deve aceitar os termos' }) })
}).refine(data => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword']
})

export const signInSchema = z.object({
  identifier: z.string().min(1, 'Informe seu usuário ou email'),
  password: z.string().min(1, 'Informe sua senha')
})

export const updateProfileSchema = z.object({
  name: nameSchema.optional(),
  bio: bioSchema,
  avatar: z.string().url().optional().or(z.literal('')),
  banner: z.string().url().optional().or(z.literal('')),
  games: z.array(z.string()).optional(),
  hobbies: z.array(z.string()).optional(),
  gender: z.enum(['M', 'F', '']).optional(),
  lookingFor: z.enum(['M', 'F', 'both']).optional(),
  intents: z.array(z.string()).optional(),
  badgeColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional().or(z.literal('')),
  theme: z.number().int().min(0).max(10).optional()
})

export const createPostSchema = z.object({
  type: z.enum(['photo', 'video']),
  src: z.string().url(),
  caption: captionSchema,
  game: z.string().max(50).optional()
})

export const createCommentSchema = z.object({
  postId: z.string().min(1),
  text: z.string().min(1).max(1000)
})

export const createGroupSchema = z.object({
  name: z.string().min(3).max(50),
  isPrivate: z.boolean(),
  password: z.string().optional()
}).refine(data => !data.isPrivate || (data.password && data.password.length >= 4), {
  message: 'Grupos privados precisam de senha (mínimo 4 caracteres)',
  path: ['password']
})

export const redeemCodeSchema = z.object({
  code: z.string().min(1).max(20).toUpperCase()
})

export function validateUsername(username: string): { valid: boolean; error?: string } {
  const result = usernameSchema.safeParse(username)
  if (!result.success) {
    return { valid: false, error: result.error.errors[0].message }
  }
  return { valid: true }
}

export function validateEmail(email: string): { valid: boolean; error?: string } {
  const result = emailSchema.safeParse(email)
  if (!result.success) {
    return { valid: false, error: result.error.errors[0].message }
  }
  return { valid: true }
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  const result = passwordSchema.safeParse(password)
  if (!result.success) {
    return { valid: false, error: result.error.errors[0].message }
  }
  return { valid: true }
}

export function getPasswordStrength(password: number): { score: number; label: string; color: string } {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  
  const levels = [
    { score: 0, label: 'Muito fraca', color: '#ff4444' },
    { score: 1, label: 'Fraca', color: '#ff8800' },
    { score: 2, label: 'Regular', color: '#ffcc00' },
    { score: 3, label: 'Boa', color: '#88cc00' },
    { score: 4, label: 'Forte', color: '#44cc00' },
    { score: 5, label: 'Muito forte', color: '#00cc44' }
  ]
  
  return levels[Math.min(score, 5)]
}