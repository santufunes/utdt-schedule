import { useState } from 'react'
import { DAY_FULL, fmt } from '../data'
import type { Day } from '../data'

export interface SlotEditorValues {
  day: Day
  start: number
  end: number
  room: string
  section: 1 | 2 | null
}

const parseTime = (v: string): number | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v)
  if (!m) return null
  const min = Number(m[1]) * 60 + Number(m[2])
  return min >= 0 && min < 24 * 60 ? min : null
}

export default function SlotEditor({
  title,
  initial,
  onSave,
  onCancel,
  onRestore,
}: {
  title: string
  initial: SlotEditorValues
  onSave: (v: SlotEditorValues) => void
  onCancel: () => void
  onRestore?: () => void
}) {
  const [day, setDay] = useState<Day>(initial.day)
  const [start, setStart] = useState(fmt(initial.start))
  const [end, setEnd] = useState(fmt(initial.end))
  const [room, setRoom] = useState(initial.room)
  const [section, setSection] = useState<string>(initial.section === null ? '' : String(initial.section))
  const [error, setError] = useState<string | null>(null)

  const save = () => {
    const s = parseTime(start)
    const e = parseTime(end)
    if (s === null || e === null) {
      setError('Horario inválido (usá HH:MM).')
      return
    }
    if (s >= e) {
      setError('La hora de fin tiene que ser posterior a la de inicio.')
      return
    }
    onSave({
      day,
      start: s,
      end: e,
      room: room.trim().slice(0, 24) || '—',
      section: section === '' ? null : (Number(section) as 1 | 2),
    })
  }

  return (
    <div
      className="modal-backdrop"
      onClick={onCancel}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel()
      }}
      role="presentation"
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{title}</h3>
        <label className="field">
          <span>Día</span>
          {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
          <select autoFocus value={day} onChange={(e) => setDay(Number(e.target.value) as Day)}>
            {([1, 2, 3, 4, 5] as Day[]).map((d) => (
              <option key={d} value={d}>
                {DAY_FULL[d]}
              </option>
            ))}
          </select>
        </label>
        <div className="field-row">
          <label className="field">
            <span>Desde</span>
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} step={300} />
          </label>
          <label className="field">
            <span>Hasta</span>
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} step={300} />
          </label>
        </div>
        <div className="field-row">
          <label className="field">
            <span>Aula</span>
            <input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              maxLength={24}
              placeholder="SV201"
            />
          </label>
          <label className="field">
            <span>Sección</span>
            <select value={section} onChange={(e) => setSection(e.target.value)}>
              <option value="">—</option>
              <option value="1">S1</option>
              <option value="2">S2</option>
            </select>
          </label>
        </div>
        {error && <p className="modal-error">{error}</p>}
        <div className="modal-actions">
          {onRestore && (
            <button className="ghost-btn restore" onClick={onRestore} title="Volver al horario original de la materia">
              restaurar original
            </button>
          )}
          <button className="ghost-btn" onClick={onCancel}>
            cancelar
          </button>
          <button className="pill-btn" onClick={save}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
