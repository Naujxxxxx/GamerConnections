export const PLANS = {
  free: { label: 'FREE', price: 0, features: ['5 likes/dia', '1 superlike/dia', 'Perfil básico'] },
  vip: { label: 'VIP', price: 19.90, features: ['Likes ilimitados', 'Superlikes ilimitados', 'Cor do selo', 'Badge VIP', 'Salas privadas'] },
  elite: { label: 'ELITE', price: 34.90, features: ['Tudo do VIP', 'Dogtags ELITE grátis', 'Destaque no perfil', 'Modo invisível', 'Estatísticas avançadas'] },
  ceo: { label: 'CEO', price: 0, features: ['Tudo do ELITE', 'Painel Admin', 'Criar medalhas', 'Gerenciar usuários', 'Acesso total'] }
} as const

export const PLAN_ORDER = ['free', 'vip', 'elite', 'ceo'] as const

export const DOGTAGS = {
  classic: { id: 'classic', name: 'Clássico', price: 4.90, freeForPlans: ['elite', 'ceo'], svg: '/assets/dogtags/ghost-classic.svg' },
  neon: { id: 'neon', name: 'Neon', price: 7.90, freeForPlans: ['elite', 'ceo'], svg: '/assets/dogtags/ghost-neon.svg' },
  elite: { id: 'elite', name: 'ELITE', price: 12.90, freeForPlans: ['elite', 'ceo'], svg: '/assets/dogtags/ghost-elite.svg' }
} as const

export const BASE_MEDALS = [
  { id: 'founder', name: 'Fundador', icon: '/assets/icons/shield.png', requirement: 'Código CEO-ACCESS' },
  { id: 'beta', name: 'BETA', icon: '/assets/icons/beta.svg', requirement: 'Fase beta' },
  { id: 'vip', name: 'VIP', icon: '/assets/icons/crown.png', requirement: 'Assinatura VIP' },
  { id: 'elite', name: 'ELITE', icon: '/assets/icons/diamond.png', requirement: 'Assinatura ELITE' },
  { id: 'creator', name: 'Criador', icon: '/assets/icons/mic.png', requirement: '1 post' },
  { id: 'marathon', name: 'Maratonista', icon: '/assets/icons/bolt.png', requirement: '5 posts' },
  { id: 'popular', name: 'Popular', icon: '/assets/icons/trophy.png', requirement: '5 seguidores' },
  { id: 'social', name: 'Sociável', icon: '/assets/icons/target.png', requirement: '3 matches' }
] as const

export const MAX_EQUIPPED_MEDALS = 6
export const MAX_HIGHLIGHTS = 3
export const FREE_LIKES_PER_DAY = 5
export const FREE_SUPERLIKES_PER_DAY = 1

export const REDEEM_CODES = {
  'BETA-USER': { medal: 'beta', label: 'BETA' },
  'BETA': { medal: 'beta', label: 'BETA' },
  'VIP-TOTAL': { plan: 'elite', label: 'ELITE' },
  'CEO-ACCESS': { plan: 'ceo', label: 'CEO', singleUse: true }
} as const

export const AVATARS = Array.from({ length: 8 }, (_, i) => `/assets/avatars/avatar${i + 1}.svg`)

export const GAMES = [
  { id: 'valorant', name: 'Valorant', icon: '/assets/games/valorant.svg' },
  { id: 'lol', name: 'League of Legends', icon: '/assets/games/lol.svg' },
  { id: 'cs2', name: 'Counter-Strike 2', icon: '/assets/games/cs2.svg' },
  { id: 'fortnite', name: 'Fortnite', icon: '/assets/games/fortnite.svg' },
  { id: 'minecraft', name: 'Minecraft', icon: '/assets/games/minecraft.svg' },
  { id: 'wow', name: 'World of Warcraft', icon: '/assets/games/wow.svg' },
  { id: 'cod', name: 'Call of Duty', icon: '/assets/games/cod.svg' },
  { id: 'apex', name: 'Apex Legends', icon: '/assets/games/apex.svg' },
  { id: 'overwatch', name: 'Overwatch 2', icon: '/assets/games/overwatch.svg' },
  { id: 'rocket', name: 'Rocket League', icon: '/assets/games/rocket.svg' }
] as const

export const STORAGE_BUCKET = 'media'
export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']