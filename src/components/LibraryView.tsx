import { useState } from 'react'
import { ArrowRight, DatabaseBackup, Link2, Music2, Repeat, Settings, Trash2 } from 'lucide-react'
import type { Song } from '../lib/types'
import type { LibraryApi } from '../lib/storage'
import { uid } from '../lib/storage'
import { extractVideoId, fetchVideoInfo, thumbnailUrl } from '../lib/youtube'
import { BackupDialog } from './BackupDialog'
import { SettingsDialog } from './SettingsDialog'

interface Props {
  api: LibraryApi
  onOpen: (songId: string) => void
}

export function LibraryView({ api, onOpen }: Props) {
  const [link, setLink] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showBackup, setShowBackup] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const songs = api.lib.songs

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    const videoId = extractVideoId(link)
    if (!videoId) {
      setError('Não reconheci esse link. Cole o endereço de um vídeo do YouTube.')
      return
    }
    setError(null)
    setLink('')
    const existing = songs.find((s) => s.videoId === videoId)
    if (existing) {
      onOpen(existing.id)
      return
    }
    const song: Song = {
      id: uid(),
      videoId,
      title: videoId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      segments: [],
    }
    api.addSong(song)
    onOpen(song.id)
    const info = await fetchVideoInfo(videoId)
    if (info?.title) api.updateSong(song.id, { title: info.title, author: info.author })
  }

  const remove = (song: Song) => {
    const n = song.segments.length
    const msg =
      n > 0
        ? `Remover "${song.title}" e seus ${n} trecho(s) salvos?`
        : `Remover "${song.title}"?`
    if (window.confirm(msg)) api.removeSong(song.id)
  }

  const sorted = [...songs].sort((a, b) => b.updatedAt - a.updatedAt)

  return (
    <div className="library">
      <header className="hero">
        <div className="brand">
          <div className="logo">
            <Repeat size={22} strokeWidth={2.6} />
          </div>
          <div>
            <h1>Replay</h1>
            <p>Treine trechos de músicas em loop</p>
          </div>
          <button
            className="icon-btn hero-action"
            onClick={() => setShowBackup(true)}
            aria-label="Backup dos dados"
            title="Backup dos dados"
          >
            <DatabaseBackup size={20} />
          </button>
          <button
            className="icon-btn"
            onClick={() => setShowSettings(true)}
            aria-label="Configurações"
            title="Configurações"
          >
            <Settings size={20} />
          </button>
        </div>

        <form className="add-form" onSubmit={add}>
          <label className="add-input">
            <Link2 size={20} />
            <input
              value={link}
              onChange={(e) => {
                setLink(e.target.value)
                setError(null)
              }}
              placeholder="Cole aqui o link do YouTube"
              inputMode="url"
              autoComplete="off"
              aria-label="Link do YouTube"
            />
          </label>
          <button className="btn btn-primary" type="submit" disabled={!link.trim()}>
            Adicionar <ArrowRight size={18} />
          </button>
        </form>
        {error && <p className="form-error">{error}</p>}
      </header>

      {songs.length === 0 ? (
        <section className="welcome">
          <div className="welcome-icon">
            <Music2 size={32} />
          </div>
          <h2>Sua biblioteca está vazia</h2>
          <p>Adicione uma música para começar a praticar.</p>
          <div className="steps">
            <div className="step-card">
              <span className="step">1</span>
              <b>Cole o link</b>
              <span>Copie o endereço do vídeo no YouTube e cole acima.</span>
            </div>
            <div className="step-card">
              <span className="step">2</span>
              <b>Marque os trechos</b>
              <span>Defina início e fim das partes que quer treinar.</span>
            </div>
            <div className="step-card">
              <span className="step">3</span>
              <b>Repita até pegar</b>
              <span>Escolha quantas vezes repetir e a velocidade.</span>
            </div>
          </div>
        </section>
      ) : (
        <section>
          <h2 className="list-title">
            Minhas músicas <span className="count">{songs.length}</span>
          </h2>
          <ul className="song-grid">
            {sorted.map((song) => (
              <li key={song.id} className="song-card">
                <button className="song-card-main" onClick={() => onOpen(song.id)}>
                  <div className="thumb">
                    <img src={thumbnailUrl(song.videoId)} alt="" loading="lazy" />
                    {song.segments.length > 0 && (
                      <div className="thumb-segs">
                        {song.segments.slice(0, 8).map((s) => (
                          <span key={s.id} style={{ background: s.color }} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="song-card-info">
                    <div className="song-title">
                      {song.title === song.videoId ? 'Carregando título…' : song.title}
                    </div>
                    {song.author && <div className="song-author">{song.author}</div>}
                    <div className="song-segs">
                      <Repeat size={13} />
                      {song.segments.length === 0
                        ? 'Nenhum trecho ainda'
                        : song.segments.length === 1
                          ? '1 trecho'
                          : `${song.segments.length} trechos`}
                    </div>
                  </div>
                </button>
                <button
                  className="icon-btn sm song-delete"
                  onClick={() => remove(song)}
                  aria-label={`Remover ${song.title}`}
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {showBackup && <BackupDialog api={api} onClose={() => setShowBackup(false)} />}
      {showSettings && <SettingsDialog api={api} onClose={() => setShowSettings(false)} />}
    </div>
  )
}
