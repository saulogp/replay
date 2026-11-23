import { useCallback, useEffect, useState } from 'react'
import type { Library, Segment, Settings, Song } from './types'
import { DEFAULT_SETTINGS } from './types'

const KEY = 'replay:library:v1'

const EMPTY: Library = { version: 1, songs: [], settings: DEFAULT_SETTINGS }

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

function load(): Library {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY
    return normalize(JSON.parse(raw))
  } catch {
    return EMPTY
  }
}

/** Garante que dados vindos do storage ou de um backup tenham o formato esperado. */
export function normalize(data: unknown): Library {
  const d = (data ?? {}) as Partial<Library>
  const songs = Array.isArray(d.songs) ? d.songs : []
  // `gap` era a antiga "pausa entre repetições": vira a contagem regressiva.
  const st = (d.settings ?? {}) as Partial<Settings> & { gap?: number }
  const legacyGap = Number(st.gap) || 0
  return {
    version: 1,
    settings: {
      countdownEnabled: st.countdownEnabled ?? legacyGap > 0,
      countdownSeconds:
        Number(st.countdownSeconds) || legacyGap || DEFAULT_SETTINGS.countdownSeconds,
      countdownSound: st.countdownSound ?? DEFAULT_SETTINGS.countdownSound,
    },
    songs: songs
      .filter((s) => s && typeof s.videoId === 'string')
      .map((s) => ({
        id: s.id || uid(),
        videoId: s.videoId,
        title: s.title || s.videoId,
        author: s.author,
        duration: s.duration,
        createdAt: s.createdAt || Date.now(),
        updatedAt: s.updatedAt || Date.now(),
        segments: (Array.isArray(s.segments) ? s.segments : []).map((g) => ({
          id: g.id || uid(),
          name: g.name || 'Trecho',
          start: Number(g.start) || 0,
          end: Number(g.end) || 0,
          repeats: Number.isFinite(Number(g.repeats)) ? Number(g.repeats) : 1,
          speed: Number(g.speed) || 1,
          color: g.color || '#9b8cff',
        })),
      })),
  }
}

export function useLibrary() {
  const [lib, setLib] = useState<Library>(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(lib))
    } catch {
      /* armazenamento indisponível: segue em memória */
    }
  }, [lib])

  const addSong = useCallback((song: Song) => {
    setLib((l) => ({ ...l, songs: [song, ...l.songs] }))
  }, [])

  const updateSong = useCallback((id: string, patch: Partial<Song>) => {
    setLib((l) => ({
      ...l,
      songs: l.songs.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: Date.now() } : s)),
    }))
  }, [])

  const removeSong = useCallback((id: string) => {
    setLib((l) => ({ ...l, songs: l.songs.filter((s) => s.id !== id) }))
  }, [])

  const saveSegment = useCallback((songId: string, seg: Segment) => {
    setLib((l) => ({
      ...l,
      songs: l.songs.map((s) => {
        if (s.id !== songId) return s
        const exists = s.segments.some((g) => g.id === seg.id)
        const segments = exists
          ? s.segments.map((g) => (g.id === seg.id ? seg : g))
          : [...s.segments, seg]
        return { ...s, segments, updatedAt: Date.now() }
      }),
    }))
  }, [])

  const removeSegment = useCallback((songId: string, segId: string) => {
    setLib((l) => ({
      ...l,
      songs: l.songs.map((s) =>
        s.id === songId
          ? { ...s, segments: s.segments.filter((g) => g.id !== segId), updatedAt: Date.now() }
          : s,
      ),
    }))
  }, [])

  const moveSegment = useCallback((songId: string, segId: string, dir: -1 | 1) => {
    setLib((l) => ({
      ...l,
      songs: l.songs.map((s) => {
        if (s.id !== songId) return s
        const i = s.segments.findIndex((g) => g.id === segId)
        const j = i + dir
        if (i < 0 || j < 0 || j >= s.segments.length) return s
        const segments = [...s.segments]
        ;[segments[i], segments[j]] = [segments[j], segments[i]]
        return { ...s, segments }
      }),
    }))
  }, [])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setLib((l) => ({ ...l, settings: { ...l.settings, ...patch } }))
  }, [])

  /** Mescla um backup: músicas com o mesmo vídeo têm os trechos combinados. */
  const importLibrary = useCallback((incoming: Library) => {
    setLib((l) => {
      const songs = [...l.songs]
      for (const s of incoming.songs) {
        const idx = songs.findIndex((x) => x.videoId === s.videoId)
        if (idx < 0) {
          songs.push(s)
        } else {
          const cur = songs[idx]
          const ids = new Set(cur.segments.map((g) => g.id))
          songs[idx] = {
            ...cur,
            segments: [...cur.segments, ...s.segments.filter((g) => !ids.has(g.id))],
          }
        }
      }
      return { ...l, songs }
    })
  }, [])

  return {
    lib,
    addSong,
    updateSong,
    removeSong,
    saveSegment,
    removeSegment,
    moveSegment,
    updateSettings,
    importLibrary,
  }
}

export type LibraryApi = ReturnType<typeof useLibrary>
