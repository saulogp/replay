import { useEffect, useState } from 'react'
import { useLibrary } from './lib/storage'
import { LibraryView } from './components/LibraryView'
import { SongView } from './components/SongView'

/** Rota simples via hash: "#/song/<id>". Faz o botão "voltar" do Android funcionar. */
function useHashRoute() {
  const read = () => window.location.hash.replace(/^#\/?/, '')
  const [route, setRoute] = useState(read)
  useEffect(() => {
    const onChange = () => setRoute(read())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export default function App() {
  const api = useLibrary()
  const route = useHashRoute()
  const songId = route.startsWith('song/') ? route.slice(5) : null
  const song = songId ? api.lib.songs.find((s) => s.id === songId) : undefined

  const goHome = () => {
    if (window.history.length > 1 && window.location.hash) window.history.back()
    else window.location.hash = ''
  }

  useEffect(() => {
    if (songId && !song) window.location.replace('#')
  }, [songId, song])

  useEffect(() => {
    document.title = song ? `${song.title} · Replay` : 'Replay'
  }, [song?.title]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => window.scrollTo(0, 0), [songId])

  return (
    <main className="app">
      {song ? (
        <SongView key={song.id} song={song} api={api} onBack={goHome} />
      ) : (
        <LibraryView api={api} onOpen={(id) => (window.location.hash = `/song/${id}`)} />
      )}
    </main>
  )
}
