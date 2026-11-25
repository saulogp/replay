import { X } from 'lucide-react'
import type { Library, Song } from '../lib/types'
import { ExportActions } from './ExportActions'

interface Props {
  song: Song
  onClose: () => void
}

/** Nome de arquivo seguro a partir do título da música. */
function slug(text: string): string {
  return (
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'musica'
  )
}

export function SongExportDialog({ song, onClose }: Props) {
  // Mesmo formato do backup, com uma música só: assim a importação é a mesma.
  const data: Pick<Library, 'version' | 'songs'> = { version: 1, songs: [song] }
  const json = JSON.stringify(data, null, 2)
  const n = song.segments.length

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <header className="sheet-header">
          <h2>Exportar música</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </header>
        <p className="hint">
          Leva "{song.title}" e {n === 1 ? 'seu trecho' : `seus ${n} trechos`} para outro aparelho
          ou para outra pessoa. Para trazer de volta, use <b>Backup → Importar</b> na biblioteca.
        </p>
        <ExportActions json={json} filename={`replay-${slug(song.title)}`} />
      </div>
    </div>
  )
}
