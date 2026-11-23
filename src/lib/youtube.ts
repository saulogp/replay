const ID_RE = /^[\w-]{11}$/

/** Extrai o ID do vídeo de praticamente qualquer formato de link do YouTube. */
export function extractVideoId(input: string): string | null {
  const s = input.trim()
  if (ID_RE.test(s)) return s
  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`)
  } catch {
    return null
  }
  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, '')
  let id: string | null = null
  if (host === 'youtu.be') {
    id = url.pathname.split('/')[1] ?? null
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = url.searchParams.get('v')
    if (!id) {
      const m = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/)
      id = m?.[1] ?? null
    }
  }
  return id && ID_RE.test(id) ? id : null
}

export function thumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}

export async function fetchVideoInfo(
  videoId: string,
): Promise<{ title: string; author: string } | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${videoId}`,
      )}`,
    )
    if (!res.ok) return null
    const data = await res.json()
    return { title: data.title ?? '', author: data.author_name ?? '' }
  } catch {
    return null
  }
}

let apiPromise: Promise<typeof YT> | null = null

/** Carrega a YouTube IFrame API uma única vez. */
export function loadYouTubeApi(): Promise<typeof YT> {
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve, reject) => {
    if (window.YT?.Player) {
      resolve(window.YT)
      return
    }
    const w = window as unknown as { onYouTubeIframeAPIReady?: () => void }
    const prev = w.onYouTubeIframeAPIReady
    w.onYouTubeIframeAPIReady = () => {
      prev?.()
      resolve(window.YT)
    }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    tag.async = true
    tag.onerror = () => {
      apiPromise = null
      reject(new Error('Não foi possível carregar o YouTube. Verifique sua conexão.'))
    }
    document.head.appendChild(tag)
  })
  return apiPromise
}
