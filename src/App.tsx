import { useEffect, useMemo, useRef, useState } from 'react'
import { COURSES, FOOTNOTES, SLOT_COURSE, COURSE_BY_ID, DAY_FULL, fmt } from './data'
import type { Day, Slot } from './data'
import { buildEngine, hasBit, matching, query, selectionMask, slotIdsFromMask } from './engine'
import { downloadICS } from './ics'
import CourseCard from './components/CourseCard'
import Calendar from './components/Calendar'
import type { CalendarEntry } from './components/Calendar'

const STORAGE_KEY = 'utdt-horarios-2026-2s'

interface Persisted {
  active: string[]
  selected: string[]
}

function loadState(): { active: Set<string>; selected: Set<string> } {
  const allCourses = new Set(COURSES.map((c) => c.id))
  const fallback = { active: allCourses, selected: new Set<string>() }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<Persisted>
    if (!Array.isArray(parsed.active) || !Array.isArray(parsed.selected)) return fallback
    const active = new Set(parsed.active.filter((id) => allCourses.has(id)))
    const selected = new Set(
      parsed.selected.filter((id) => {
        const courseId = SLOT_COURSE.get(id)
        return courseId !== undefined && active.has(courseId)
      }),
    )
    return { active, selected }
  } catch {
    return fallback
  }
}

export default function App() {
  const [init] = useState(loadState)
  const [active, setActive] = useState(init.active)
  const [selected, setSelected] = useState(init.selected)
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const data: Persisted = { active: [...active], selected: [...selected] }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // almacenamiento no disponible: la app funciona sin persistencia
    }
  }, [active, selected])

  const engine = useMemo(() => buildEngine(COURSES, active), [active])
  const mask = useMemo(() => selectionMask(engine, selected), [engine, selected])
  const q = useMemo(() => query(engine, mask), [engine, mask])

  const complete = engine.totalPicks > 0 && selected.size === engine.totalPicks && q.count > 0

  const toggleSlot = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        const p = engine.pos.get(id)
        if (p === undefined || !hasBit(q.avail, p)) return prev
        next.add(id)
      }
      return next
    })
  }

  const toggleCourse = (id: string) => {
    setActive((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        setSelected((sel) => new Set([...sel].filter((s) => SLOT_COURSE.get(s) !== id)))
      } else {
        next.add(id)
      }
      return next
    })
  }

  const clearCourse = (id: string) => {
    setSelected((sel) => new Set([...sel].filter((s) => SLOT_COURSE.get(s) !== id)))
  }

  const reset = () => {
    setActive(new Set(COURSES.map((c) => c.id)))
    setSelected(new Set())
  }

  const autocomplete = () => {
    const options = matching(engine, mask)
    if (options.length === 0) return
    const pick = options[Math.floor(Math.random() * options.length)]
    setSelected(new Set(slotIdsFromMask(engine, pick)))
  }

  const entries: CalendarEntry[] = []
  for (const [i, slot] of engine.slots.entries()) {
    const isSel = selected.has(slot.id)
    const ghost = !isSel && q.count > 0 && hasBit(q.forced, i)
    if (isSel || ghost) {
      const course = COURSE_BY_ID.get(slot.courseId)!
      entries.push({ slot, color: course.color, short: course.short, ghost })
    }
  }
  const hasGhosts = entries.some((e) => e.ghost)

  const scheduleText = () => {
    const byDay = new Map<Day, { start: number; text: string }[]>()
    for (const slot of engine.slots) {
      if (!selected.has(slot.id)) continue
      const course = COURSE_BY_ID.get(slot.courseId)!
      const list = byDay.get(slot.day) ?? []
      list.push({
        start: slot.start,
        text: `${fmt(slot.start)}–${fmt(slot.end)}  ${course.short} ${
          slot.kind === 'T' ? 'Teórica' : 'Práctica'
        } (${slot.room}${slot.section ? ` · S${slot.section}` : ''})`,
      })
      byDay.set(slot.day, list)
    }
    const lines = ['Mi horario UTDT · 2026 2º semestre', '']
    for (const day of [1, 2, 3, 4, 5] as Day[]) {
      const list = byDay.get(day)
      lines.push(`${DAY_FULL[day]}:`)
      if (!list) {
        lines.push('  — libre —')
      } else {
        for (const item of list.sort((a, b) => a.start - b.start)) lines.push(`  ${item.text}`)
      }
      lines.push('')
    }
    return lines.join('\n').trimEnd()
  }

  const copySchedule = async () => {
    try {
      await navigator.clipboard.writeText(scheduleText())
      setCopied(true)
      if (copiedTimer.current) clearTimeout(copiedTimer.current)
      copiedTimer.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard no disponible: nada que hacer
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <h1>Horarios UTDT</h1>
            <span className="tag">2026 · 2º sem</span>
          </div>
          <div className="stats" aria-live="polite">
            <span key={q.count} className={`count ${q.count === 0 ? 'zero' : ''}`}>
              {q.count.toLocaleString('es-AR')}
            </span>
            <span className="count-label">
              {q.count === 1 ? 'combinación posible' : 'combinaciones posibles'}
            </span>
            <span className="progress">
              {selected.size}/{engine.totalPicks} clases
            </span>
          </div>
          <div className="actions">
            <button
              className="icon-btn"
              onClick={autocomplete}
              disabled={q.count === 0 || complete}
              title="Completar al azar con una combinación válida"
              aria-label="Completar al azar"
            >
              🎲
            </button>
            <button
              className="icon-btn"
              onClick={reset}
              disabled={selected.size === 0 && active.size === COURSES.length}
              title="Reiniciar todo"
              aria-label="Reiniciar"
            >
              ↺
            </button>
          </div>
        </div>
      </header>

      <main className="layout">
        <div className="cards-col">
          {q.count === 0 && (
            <div className="banner danger" role="alert">
              Sin combinaciones posibles con esta selección. Destildá alguna clase para
              destrabar el resto.
            </div>
          )}
          {complete && (
            <div className="banner success">
              <span>¡Horario completo, sin superposiciones! ✓</span>
              <span className="banner-actions">
                <button className="pill-btn" onClick={copySchedule}>
                  {copied ? 'Copiado ✓' : 'Copiar horario'}
                </button>
                <button
                  className="pill-btn"
                  onClick={() => downloadICS(engine.slots.filter((s) => selected.has(s.id)))}
                  title="Todo el semestre (03/08–27/11), sin feriados ni semanas de parciales, sin alertas"
                >
                  Descargar .ics
                </button>
              </span>
            </div>
          )}
          {COURSES.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              engine={engine}
              q={q}
              selected={selected}
              isActive={active.has(course.id)}
              onToggleSlot={toggleSlot}
              onToggleCourse={toggleCourse}
              onClear={clearCourse}
            />
          ))}
          <section className="footnotes">
            <h3>Notas</h3>
            <ol>
              {FOOTNOTES.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="side">
          <Calendar
            entries={entries}
            complete={complete}
            legend={COURSES.filter((c) => active.has(c.id)).map((c) => ({
              short: c.short,
              color: c.color,
            }))}
            showGhostHint={hasGhosts}
          />
        </aside>
      </main>
    </div>
  )
}

export type { Slot }
