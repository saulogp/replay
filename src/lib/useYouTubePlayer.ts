import { useEffect, useRef, useState, type RefObject } from 'react'
import { loadYouTubeApi } from './youtube'

const ERROR_MESSAGES: Record<number, string> = {
  2: 'Link de vídeo inválido.',
  5: 'O player não conseguiu reproduzir este vídeo.',
  100: 'Vídeo não encontrado (removido ou privado).',
  101: 'O dono deste vídeo não permite que ele seja tocado fora do YouTube.',
  150: 'O dono deste vídeo não permite que ele seja tocado fora do YouTube.',
  153: 'O YouTube recusou a reprodução incorporada deste vídeo.',
}

export function useYouTubePlayer(hostRef: RefObject<HTMLDivElement | null>, videoId: string) {
  const playerRef = useRef<YT.Player | null>(null)
  const [ready, setReady] = useState(false)
  const [playerState, setPlayerState] = useState<number>(-1)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let cancelled = false
    let player: YT.Player | null = null
    // O YouTube substitui o elemento alvo por um iframe; usamos um filho
    // criado aqui para não brigar com o React pelo DOM.
    const target = document.createElement('div')
    host.appendChild(target)
    setError(null)

    loadYouTubeApi()
      .then((YTApi) => {
        if (cancelled) return
        player = new YTApi.Player(target, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              if (cancelled) return
              playerRef.current = player
              setReady(true)
            },
            onStateChange: (e) => !cancelled && setPlayerState(e.data),
            onError: (e) =>
              !cancelled && setError(ERROR_MESSAGES[e.data] ?? `Erro do YouTube (${e.data}).`),
          },
        })
      })
      .catch((e: Error) => !cancelled && setError(e.message))

    return () => {
      cancelled = true
      playerRef.current = null
      setReady(false)
      setPlayerState(-1)
      try {
        player?.destroy()
      } catch {
        /* ignore */
      }
      host.innerHTML = ''
    }
  }, [hostRef, videoId])

  return { playerRef, ready, playerState, error }
}
