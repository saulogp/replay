import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  Copy,
  Flag,
  FlagTriangleRight,
  Pause,
  Pencil,
  Play,
  Plus,
  Repeat,
  Share2,
  SlidersHorizontal,
  RotateCcw,
  RotateCw,
  Square,
  Timer,
  X,
} from 'lucide-react'
import type { Segment, Song } from '../lib/types'
import { SEGMENT_COLORS, SPEED_OPTIONS } from '../lib/types'
import type { LibraryApi } from '../lib/storage'
import { uid } from '../lib/storage'
import { formatDuration, formatTime } from '../lib/time'
import { beep, unlockAudio } from '../lib/beep'
import { useYouTubePlayer } from '../lib/useYouTubePlayer'
import { Timeline } from './Timeline'
import { SegmentEditor } from './SegmentEditor'
import { CountdownSetting } from './CountdownSetting'
import { SongExportDialog } from './SongExportDialog'

interface Props {
  song: Song
  api: LibraryApi
  onBack: () => void
}

/** playing = loop armado/tocando · countdown = contando antes de tocar · done = terminou */
type LoopStatus = 'playing' | 'countdown' | 'done'

interface ActiveLoop {
  id: string
  rep: number
  status: LoopStatus
}

const PLAYING = 1

export function SongView({ song, api, onBack }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const { playerRef, ready, playerState, error } = useYouTubePlayer(hostRef, song.videoId)

  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(song.duration ?? 0)
  const [rate, setRate] = useState(1)
  const [active, setActive] = useState<ActiveLoop | null>(null)
  const [countLeft, setCountLeft] = useState(0)
  const [markA, setMarkA] = useState<number | null>(null)
  const [editing, setEditing] = useState<{ seg: Segment; isNew: boolean } | null>(null)
  const [editingTitle, setEditingTitle] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showExport, setShowExport] = useState(false)

  const settings = api.lib.settings
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  // Estado do loop em ref: o "relógio" (setInterval) e os timers precisam sempre do valor atual.
  const loop = useRef<{
    seg: Segment | null
    rep: number
    timers: number[]
    countUntil: number
  }>({ seg: null, rep: 1, timers: [], countUntil: 0 })

  const isPlaying = playerState === PLAYING
  const counting = active?.status === 'countdown'

  // Se o trecho em loop for editado, o loop passa a usar os novos tempos.
  useEffect(() => {
    const L = loop.current
    if (!L.seg) return
    const fresh = song.segments.find((s) => s.id === L.seg!.id)
    if (fresh) L.seg = fresh
    else stopLoop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song.segments])

  // Ao carregar: pega a duração e, se preciso, o título do vídeo.
  useEffect(() => {
    if (!ready) return
    const p = playerRef.current
    if (!p) return
    const d = p.getDuration()
    if (d > 0) {
      setDuration(d)
      if (Math.abs((song.duration ?? 0) - d) > 0.5) api.updateSong(song.id, { duration: d })
    }
    if (!song.title || song.title === song.videoId) {
      const data = (p as unknown as { getVideoData?: () => { title?: string; author?: string } })
        .getVideoData?.()
      if (data?.title) api.updateSong(song.id, { title: data.title, author: data.author })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  /** Cancela uma contagem em andamento (o vídeo continua pausado). */
  const clearCountdown = () => {
    const L = loop.current
    L.timers.forEach((t) => window.clearTimeout(t))
    L.timers = []
    L.countUntil = 0
    setCountLeft(0)
  }

  /**
   * Toca a repetição `rep` do trecho (o vídeo já deve estar no início dele).
   * Com a contagem ativada, pausa, conta N segundos (com bip opcional) e só então toca.
   */
  const startRep = (seg: Segment, rep: number) => {
    const p = playerRef.current
    if (!p) return
    clearCountdown()
    const { countdownEnabled, countdownSeconds: n, countdownSound } = settingsRef.current
    if (!countdownEnabled || n <= 0) {
      p.playVideo()
      setActive({ id: seg.id, rep, status: 'playing' })
      return
    }
    p.pauseVideo()
    const L = loop.current
    L.countUntil = Date.now() + n * 1000
    setCountLeft(n)
    setActive({ id: seg.id, rep, status: 'countdown' })
    if (countdownSound) {
      beep(n === 1)
      for (let i = 1; i < n; i++) L.timers.push(window.setTimeout(() => beep(i === n - 1), i * 1000))
    }
    L.timers.push(
      window.setTimeout(() => {
        L.timers = []
        L.countUntil = 0
        setCountLeft(0)
        setActive((a) => (a ? { ...a, status: 'playing' } : a))
        playerRef.current?.playVideo()
      }, n * 1000),
    )
  }

  const onSegmentEnd = () => {
    const p = playerRef.current
    const L = loop.current
    const seg = L.seg
    if (!p || !seg) return
    const more = seg.repeats === 0 || L.rep < seg.repeats
    p.seekTo(seg.start, true)
    if (!more) {
      p.pauseVideo()
      L.seg = null
      setActive({ id: seg.id, rep: L.rep, status: 'done' })
      return
    }
    L.rep += 1
    const { countdownEnabled, countdownSeconds } = settingsRef.current
    if (countdownEnabled && countdownSeconds > 0) startRep(seg, L.rep)
    else setActive({ id: seg.id, rep: L.rep, status: 'playing' })
  }

  // Relógio: atualiza o tempo, a contagem e detecta o fim do trecho.
  useEffect(() => {
    if (!ready) return
    const id = window.setInterval(() => {
      const p = playerRef.current
      if (!p) return
      const t = p.getCurrentTime() ?? 0
      setTime(t)
      const L = loop.current
      if (L.countUntil) {
        setCountLeft(Math.max(1, Math.ceil((L.countUntil - Date.now()) / 1000)))
        return
      }
      if (!L.seg || p.getPlayerState() !== PLAYING) return
      if (t >= L.seg.end - 0.04) onSegmentEnd()
    }, 40)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  useEffect(() => () => clearCountdown(), [])

  const applyRate = (r: number) => {
    playerRef.current?.setPlaybackRate(r)
    setRate(r)
  }

  const playSegment = useCallback(
    (seg: Segment) => {
      const p = playerRef.current
      if (!p) return
      unlockAudio() // estamos dentro do toque do usuário: libera o bip
      loop.current.seg = seg
      loop.current.rep = 1
      applyRate(seg.speed)
      p.seekTo(seg.start, true)
      setTime(seg.start)
      startRep(seg, 1)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  function stopLoop() {
    clearCountdown()
    loop.current.seg = null
    setActive(null)
  }

  /** Interrompe a contagem e deixa o loop armado, com o vídeo pausado. */
  const cancelCountdown = () => {
    if (!loop.current.countUntil) return
    clearCountdown()
    playerRef.current?.pauseVideo()
    setActive((a) => (a ? { ...a, status: 'playing' } : a))
  }

  const seek = (t: number) => {
    const p = playerRef.current
    if (!p) return
    const L = loop.current
    // Sair da área do trecho encerra o loop.
    if (L.seg && (t < L.seg.start - 0.2 || t > L.seg.end)) stopLoop()
    cancelCountdown()
    p.seekTo(t, true)
    setTime(t)
  }

  const togglePlay = () => {
    const p = playerRef.current
    if (!p) return
    if (loop.current.countUntil) return cancelCountdown()
    if (isPlaying) {
      p.pauseVideo()
      return
    }
    if (active?.status === 'done') {
      const seg = song.segments.find((s) => s.id === active.id)
      if (seg) return playSegment(seg)
    }
    p.playVideo()
  }

  // Atalho de teclado (web): espaço = play/pause.
  const toggleRef = useRef(togglePlay)
  toggleRef.current = togglePlay
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (e.code !== 'Space' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return
      e.preventDefault()
      toggleRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const getCurrentTime = () => playerRef.current?.getCurrentTime() ?? time

  const nextColor = () => SEGMENT_COLORS[song.segments.length % SEGMENT_COLORS.length]
  const newSegment = (start: number, end: number): Segment => ({
    id: uid(),
    name: `Trecho ${song.segments.length + 1}`,
    start,
    end,
    repeats: 3,
    speed: 1,
    color: nextColor(),
  })

  const handleMark = () => {
    const t = getCurrentTime()
    if (markA === null) {
      setMarkA(t)
      return
    }
    const start = Math.min(markA, t)
    const end = Math.max(markA, t)
    setMarkA(null)
    cancelCountdown()
    playerRef.current?.pauseVideo()
    setEditing({ seg: newSegment(start, end > start + 0.3 ? end : start + 5), isNew: true })
  }

  const openNew = () => {
    const t = getCurrentTime()
    cancelCountdown()
    playerRef.current?.pauseVideo()
    setEditing({
      seg: newSegment(t, Math.min(duration || t + 10, t + 10)),
      isNew: true,
    })
  }

  const deleteSegment = (seg: Segment) => {
    if (!window.confirm(`Excluir o trecho "${seg.name}"?`)) return
    if (active?.id === seg.id) stopLoop()
    api.removeSegment(song.id, seg.id)
    setEditing(null)
  }

  const activeSeg = active ? song.segments.find((s) => s.id === active.id) : undefined

  return (
    <div className="song-view">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="Voltar para a biblioteca">
          <ChevronLeft size={24} />
        </button>
        <div className="topbar-title">
          {editingTitle ? (
            <input
              className="text-input title-input"
              defaultValue={song.title}
              autoFocus
              onBlur={(e) => {
                const v = e.target.value.trim()
                if (v) api.updateSong(song.id, { title: v })
                setEditingTitle(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                if (e.key === 'Escape') setEditingTitle(false)
              }}
            />
          ) : (
            <button className="title-btn" onClick={() => setEditingTitle(true)}>
              <span className="title-text">{song.title}</span>
              <Pencil size={14} className="title-pencil" />
            </button>
          )}
          {song.author && !editingTitle && <span className="topbar-sub">{song.author}</span>}
        </div>
        <button
          className="icon-btn"
          onClick={() => setShowExport(true)}
          aria-label="Exportar música"
          title="Exportar música"
        >
          <Share2 size={20} />
        </button>
      </header>

      <div className="song-layout">
        <section className="player-col">
          <div className={`player-card ${showSettings ? 'show-settings' : ''}`}>
            <div className="video-frame">
              <div ref={hostRef} className="video-host" />
              {!ready && !error && <div className="video-overlay">Carregando vídeo…</div>}
              {error && <div className="video-overlay error">{error}</div>}
              {counting && (
                <button
                  className="video-overlay countdown"
                  onClick={cancelCountdown}
                  aria-label="Cancelar contagem"
                >
                  <span key={countLeft} className="countdown-num">
                    {countLeft}
                  </span>
                  <span>
                    {active.rep === 1
                      ? 'Prepare-se…'
                      : `Repetição ${active.rep}${activeSeg?.repeats ? ` de ${activeSeg.repeats}` : ''}`}
                  </span>
                </button>
              )}
            </div>

            <div className="player-body">
              {activeSeg && active ? (
                <div className="loop-banner" style={{ ['--seg' as string]: activeSeg.color }}>
                  <Repeat size={16} />
                  <div className="loop-banner-text">
                    <strong>{activeSeg.name}</strong>
                    <span>
                      {active.status === 'done'
                        ? `Concluído · ${activeSeg.repeats}× tocado`
                        : counting
                          ? `Começa em ${countLeft}…`
                          : activeSeg.repeats === 0
                          ? `Repetição ${active.rep} · sem parar`
                          : `Repetição ${active.rep} de ${activeSeg.repeats}`}
                    </span>
                  </div>
                  {activeSeg.repeats > 1 && (
                    <div className="rep-dots" aria-hidden>
                      {Array.from({ length: Math.min(activeSeg.repeats, 12) }, (_, i) => (
                        <span
                          key={i}
                          className={
                            i < active.rep - (active.status === 'done' ? 0 : 1)
                              ? 'done'
                              : i === active.rep - 1
                                ? 'now'
                                : ''
                          }
                        />
                      ))}
                    </div>
                  )}
                  <button className="icon-btn sm" onClick={stopLoop} aria-label="Sair do loop">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="loop-banner idle">
                  <Play size={16} />
                  <div className="loop-banner-text">
                    <strong>Música inteira</strong>
                    <span>Escolha um trecho abaixo para tocar em loop</span>
                  </div>
                </div>
              )}

              <Timeline
                duration={duration}
                time={time}
                segments={song.segments}
                activeId={active?.id ?? null}
                markA={markA}
                onSeek={seek}
                onPlaySegment={playSegment}
              />

              <div className="transport">
                <button
                  className="icon-btn"
                  onClick={() => seek(Math.max(0, getCurrentTime() - 5))}
                  aria-label="Voltar 5 segundos"
                  disabled={!ready}
                >
                  <RotateCcw size={22} />
                </button>
                <button
                  className="play-btn"
                  onClick={togglePlay}
                  disabled={!ready}
                  aria-label={counting ? 'Cancelar contagem' : isPlaying ? 'Pausar' : 'Tocar'}
                >
                  {isPlaying || counting ? (
                    <Pause size={28} fill="currentColor" />
                  ) : (
                    <Play size={28} fill="currentColor" />
                  )}
                </button>
                <button
                  className="icon-btn"
                  onClick={() => seek(Math.min(duration, getCurrentTime() + 5))}
                  aria-label="Avançar 5 segundos"
                  disabled={!ready}
                >
                  <RotateCw size={22} />
                </button>
              </div>

              <div className="mark-row">
                <button
                  className={`btn ${markA === null ? 'btn-soft' : 'btn-primary'} grow`}
                  onClick={handleMark}
                  disabled={!ready}
                >
                  {markA === null ? (
                    <>
                      <Flag size={18} /> Marcar início
                    </>
                  ) : (
                    <>
                      <FlagTriangleRight size={18} /> Marcar fim{' '}
                      <small>(início {formatTime(markA)})</small>
                    </>
                  )}
                </button>
                {markA !== null && (
                  <button
                    className="icon-btn"
                    onClick={() => setMarkA(null)}
                    aria-label="Cancelar marcação"
                  >
                    <X size={20} />
                  </button>
                )}
                <button
                  className={`icon-btn settings-toggle ${showSettings ? 'is-on' : ''}`}
                  onClick={() => setShowSettings((v) => !v)}
                  aria-label="Velocidade e contagem"
                  aria-expanded={showSettings}
                >
                  <SlidersHorizontal size={20} />
                  {settings.countdownEnabled && (
                    <span className="toggle-badge">{settings.countdownSeconds}s</span>
                  )}
                </button>
              </div>

              <div className="settings-row">
                <div className="setting">
                  <span className="setting-label">
                    <Timer size={14} /> Velocidade
                  </span>
                  <div className="chips compact">
                    {SPEED_OPTIONS.map((s) => (
                      <button
                        key={s}
                        className={`chip ${rate === s ? 'is-on' : ''}`}
                        onClick={() => applyRate(s)}
                        disabled={!ready}
                      >
                        {s}×
                      </button>
                    ))}
                  </div>
                </div>
                <CountdownSetting settings={settings} onChange={api.updateSettings} />
              </div>
            </div>
          </div>
        </section>

        <section className="segments-col">
          <div className="section-head">
            <h2>
              Trechos <span className="count">{song.segments.length}</span>
            </h2>
            <button className="btn btn-primary sm" onClick={openNew} disabled={!ready}>
              <Plus size={18} /> Novo trecho
            </button>
          </div>

          {song.segments.length === 0 ? (
            <div className="howto">
              <h3>Como criar seu primeiro trecho</h3>
              <ol>
                <li>
                  <span className="step">1</span>
                  <div>
                    Dê play e, no começo da parte que quer treinar, toque em{' '}
                    <b>Marcar início</b>.
                  </div>
                </li>
                <li>
                  <span className="step">2</span>
                  <div>
                    Quando a parte terminar, toque em <b>Marcar fim</b>.
                  </div>
                </li>
                <li>
                  <span className="step">3</span>
                  <div>
                    Dê um nome, escolha <b>quantas vezes repetir</b> e a <b>velocidade</b>. Pronto!
                  </div>
                </li>
              </ol>
              <p className="hint">
                Prefere digitar os tempos? Use <b>Novo trecho</b> e ajuste início e fim.
              </p>
            </div>
          ) : (
            <ul className="segment-list">
              {song.segments.map((seg, i) => {
                const isActive = active?.id === seg.id
                const looping = isActive && active.status !== 'done'
                const running = looping && (isPlaying || active.status === 'countdown')
                const progress =
                  looping && seg.end > seg.start
                    ? Math.min(100, Math.max(0, ((time - seg.start) / (seg.end - seg.start)) * 100))
                    : 0
                return (
                  <li
                    key={seg.id}
                    className={`segment-card ${isActive ? 'is-active' : ''}`}
                    style={{ ['--seg' as string]: seg.color }}
                  >
                    <button
                      className="segment-play"
                      onClick={() => {
                        if (!running) return playSegment(seg)
                        playerRef.current?.pauseVideo()
                        stopLoop()
                      }}
                      aria-label={running ? `Parar ${seg.name}` : `Tocar ${seg.name}`}
                      disabled={!ready}
                    >
                      {running ? (
                        <Square size={18} fill="currentColor" />
                      ) : (
                        <Play size={20} fill="currentColor" />
                      )}
                    </button>
                    <div className="segment-info" onClick={() => playSegment(seg)}>
                      <div className="segment-name">{seg.name}</div>
                      <div className="segment-meta">
                        {formatTime(seg.start)} → {formatTime(seg.end)}
                        <span className="dot">·</span>
                        {formatDuration(seg.end - seg.start)}
                      </div>
                      <div className="badges">
                        <span className="badge">
                          <Repeat size={12} />
                          {seg.repeats === 0 ? '∞' : seg.repeats === 1 ? '1 vez' : `${seg.repeats}×`}
                        </span>
                        {seg.speed !== 1 && (
                          <span className="badge">
                            <Timer size={12} />
                            {seg.speed}×
                          </span>
                        )}
                        {isActive && active.status === 'done' && (
                          <span className="badge ok">
                            <Check size={12} /> feito
                          </span>
                        )}
                        {looping && (
                          <span className="badge live">
                            {seg.repeats === 0 ? `${active.rep}ª vez` : `${active.rep}/${seg.repeats}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="segment-actions">
                      <button
                        className="icon-btn sm"
                        onClick={() => setEditing({ seg, isNew: false })}
                        aria-label={`Editar ${seg.name}`}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-btn sm"
                        onClick={() =>
                          api.saveSegment(song.id, {
                            ...seg,
                            id: uid(),
                            name: `${seg.name} (cópia)`,
                          })
                        }
                        aria-label={`Duplicar ${seg.name}`}
                      >
                        <Copy size={16} />
                      </button>
                      <div className="reorder">
                        <button
                          className="icon-btn xs"
                          disabled={i === 0}
                          onClick={() => api.moveSegment(song.id, seg.id, -1)}
                          aria-label="Mover para cima"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          className="icon-btn xs"
                          disabled={i === song.segments.length - 1}
                          onClick={() => api.moveSegment(song.id, seg.id, 1)}
                          aria-label="Mover para baixo"
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>
                    </div>
                    {looping && <div className="segment-progress" style={{ width: `${progress}%` }} />}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      {editing && (
        <SegmentEditor
          key={editing.seg.id}
          initial={editing.seg}
          isNew={editing.isNew}
          duration={duration}
          getCurrentTime={getCurrentTime}
          onCancel={() => {
            playerRef.current?.pauseVideo()
            stopLoop()
            setEditing(null)
          }}
          onSave={(seg) => {
            api.saveSegment(song.id, seg)
            setEditing(null)
          }}
          onPreview={playSegment}
          onDelete={editing.isNew ? undefined : () => deleteSegment(editing.seg)}
        />
      )}
      {showExport && <SongExportDialog song={song} onClose={() => setShowExport(false)} />}
    </div>
  )
}
