import { formatDistanceToNow, format, parseISO, isToday, isYesterday, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatRelativeTime(dateString: string): string {
  try {
    const date = parseISO(dateString)
    return formatDistanceToNow(date, { addSuffix: true, locale: ptBR })
  } catch {
    return 'agora'
  }
}

export function formatDateTime(dateString: string): string {
  try {
    const date = parseISO(dateString)
    if (isToday(date)) {
      return `Hoje às ${format(date, 'HH:mm')}`
    }
    if (isYesterday(date)) {
      return `Ontem às ${format(date, 'HH:mm')}`
    }
    if (differenceInDays(new Date(), date) < 7) {
      return format(date, 'EEEE', { locale: ptBR })
    }
    return format(date, 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return ''
  }
}

export function formatFullDate(dateString: string): string {
  try {
    return format(parseISO(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
  } catch {
    return ''
  }
}

export function formatShortDate(dateString: string): string {
  try {
    return format(parseISO(dateString), 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return ''
  }
}

export function formatTime(dateString: string): string {
  try {
    return format(parseISO(dateString), 'HH:mm', { locale: ptBR })
  } catch {
    return ''
  }
}

export function calculateAge(birthdate: string): number {
  try {
    const birth = parseISO(birthdate)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
  } catch {
    return 0
  }
}

export function isOldEnough(birthdate: string, minAge = 13): boolean {
  return calculateAge(birthdate) >= minAge
}

export function getZodiacSign(birthdate: string): string {
  try {
    const date = parseISO(birthdate)
    const day = date.getDate()
    const month = date.getMonth() + 1
    
    const signs = [
      { sign: '♑ Capricórnio', start: [1, 20], end: [2, 18] },
      { sign: '♒ Aquário', start: [2, 19], end: [3, 20] },
      { sign: '♓ Peixes', start: [3, 21], end: [4, 19] },
      { sign: '♈ Áries', start: [4, 20], end: [5, 20] },
      { sign: '♉ Touro', start: [5, 21], end: [6, 20] },
      { sign: '♊ Gêmeos', start: [6, 21], end: [7, 22] },
      { sign: '♋ Câncer', start: [7, 23], end: [8, 22] },
      { sign: '♌ Leão', start: [8, 23], end: [9, 22] },
      { sign: '♍ Virgem', start: [9, 23], end: [10, 22] },
      { sign: '♎ Libra', start: [10, 23], end: [11, 21] },
      { sign: '♏ Escorpião', start: [11, 22], end: [12, 21] },
      { sign: '♐ Sagitário', start: [12, 22], end: [1, 19] }
    ]
    
    for (const s of signs) {
      const [startMonth, startDay] = s.start
      const [endMonth, endDay] = s.end
      
      if ((month === startMonth && day >= startDay) || (month === endMonth && day <= endDay)) {
        return s.sign
      }
    }
    return '♑ Capricórnio'
  } catch {
    return ''
  }
}