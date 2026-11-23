export interface Segment {
  id: string
  name: string
  /** segundos */
  start: number
  /** segundos */
  end: number
  /** quantas vezes tocar; 0 = infinito */
  repeats: number
  /** velocidade de reprodução (0.25 – 2) */
  speed: number
  color: string
}

export interface Song {
  id: string
  videoId: string
  title: string
  author?: string
  duration?: number
  createdAt: number
  updatedAt: number
  segments: Segment[]
}

export interface Settings {
  /** contagem regressiva antes de o trecho começar e antes de cada repetição */
  countdownEnabled: boolean
  /** duração da contagem, em segundos */
  countdownSeconds: number
  /** bip a cada número da contagem */
  countdownSound: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  countdownEnabled: false,
  countdownSeconds: 3,
  countdownSound: true,
}

export interface Library {
  version: 1
  songs: Song[]
  settings: Settings
}

export const SEGMENT_COLORS = [
  '#ff6b6b',
  '#ffb347',
  '#ffe066',
  '#5ce1a0',
  '#4dc9ff',
  '#9b8cff',
  '#ff7ad9',
]

export const REPEAT_OPTIONS = [1, 2, 3, 5, 10, 0]
export const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5]
export const COUNTDOWN_OPTIONS = [1, 2, 3, 4, 5, 8]
