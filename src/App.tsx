import { useEffect, useMemo, useRef, useState } from 'react'
import { COURSES, FOOTNOTES, SLOT_COURSE, COURSE_BY_ID, DAY_FULL, fmt } from './data'
import type { Day, Slot } from './data'
import { buildEngine, hasBit, matching, query, selectionMask, slotIdsFromMask } from './engine'
import { downloadICS } from './ics'
import {
  decideSyncDirection,
  disconnect,
  ensureToken,
  fetchCloudSelection,
  hasValidToken,
  queueSync,
} from './gsync'
import CourseCard from './components/CourseCard'
import Calendar from './components/Calendar'
import type { CalendarEntry } from './components/Calendar'

const STORAGE_KEY = 'utdt-horarios-2026-2s'
const GSYNC_KEY = 'utdt-horarios-gsync'
const LAST_SYNCED_KEY = 'utdt-horarios-last-synced'

type GStatus = 'off' | 'syncing' | 'synced' | 'reconnect' | 'error'

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
  const [gstatus, setGstatus] = useState<GStatus>(() => {
    try {
      return localStorage.getItem(GSYNC_KEY) ? 'reconnect' : 'off'
    } catch {
      return 'off'
    }
  })
  const [gerror, setGerror] = useState<string | null>(null)

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

  const markConnected = () => {
    setGerror(null)
    try {
      localStorage.setItem(GSYNC_KEY, '1')
    } catch {
      // sin almacenamiento: la conexión no persiste entre visitas
    }
  }

  const readLastSynced = (): string[] | null => {
    try {
      const raw = localStorage.getItem(LAST_SYNCED_KEY)
      return raw ? (JSON.parse(raw) as string[]) : null
    } catch {
      return null
    }
  }

  const writeLastSynced = (ids: Iterable<string>) => {
    try {
      localStorage.setItem(LAST_SYNCED_KEY, JSON.stringify([...ids].sort()))
    } catch {
      // nada
    }
  }

  const pushNow = async (ids: Set<string>) => {
    setGstatus('syncing')
    try {
      await queueSync(engine.slots.filter((s) => ids.has(s.id)))
      writeLastSynced(ids)
      setGstatus('synced')
      markConnected()
    } catch (e) {
      setGstatus('error')
      setGerror(e instanceof Error ? e.message : String(e))
    }
  }

  // Reconcilia con el calendario (fuente de verdad entre dispositivos):
  // un dispositivo nuevo adopta lo que hay en la nube; las ediciones
  // locales pendientes se suben.
  const adopting = useRef(false)
  const pull = async () => {
    const ok = hasValidToken() || (await ensureToken())
    if (!ok) {
      setGstatus((s) => {
        if (s === 'off') {
          setGerror('Google no pudo abrir su ventana (¿popup bloqueado?). Tocá de nuevo.')
          return 'error'
        }
        return 'reconnect'
      })
      return
    }
    setGstatus('syncing')
    try {
      const cloud = await fetchCloudSelection()
      const dir = decideSyncDirection([...selected], readLastSynced(), cloud)
      if (dir === 'adopt-cloud') {
        adopting.current = true
        setActive((prev) => {
          const next = new Set(prev)
          for (const id of cloud) next.add(SLOT_COURSE.get(id)!)
          return next
        })
        setSelected(new Set(cloud))
        writeLastSynced(cloud)
        setGstatus('synced')
        markConnected()
      } else if (dir === 'push-local') {
        await pushNow(selected)
      } else {
        writeLastSynced(selected)
        setGstatus('synced')
        markConnected()
      }
    } catch (e) {
      setGstatus('error')
      setGerror(e instanceof Error ? e.message : String(e))
    }
  }

  // Al abrir: si este dispositivo ya estuvo conectado, intentar retomar
  // en silencio (si el popup silencioso falla, queda "Reconectar").
  useEffect(() => {
    if (gstatus === 'reconnect') void pull()
    // sólo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Al volver a la pestaña, refrescar desde el calendario.
  useEffect(() => {
    const onVisible = () => {
      if (
        document.visibilityState === 'visible' &&
        hasValidToken() &&
        (gstatus === 'synced' || gstatus === 'error')
      ) {
        void pull()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gstatus, selected, active])

  // Auto-push (con debounce) ante cada edición mientras esté conectado.
  useEffect(() => {
    if (gstatus === 'off' || gstatus === 'reconnect') return
    if (adopting.current) {
      adopting.current = false
      return
    }
    const t = setTimeout(() => {
      void pushNow(selected)
    }, 2000)
    return () => clearTimeout(t)
    // pushNow se recrea por render; alcanza con reaccionar a la selección.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, active])

  const gsyncClick = () => {
    void pull()
  }

  const gsyncOff = () => {
    disconnect()
    setGstatus('off')
    setGerror(null)
    try {
      localStorage.removeItem(GSYNC_KEY)
      localStorage.removeItem(LAST_SYNCED_KEY)
    } catch {
      // nada
    }
  }

  const gsyncLabel: Record<GStatus, string> = {
    off: 'Conectar Google',
    syncing: 'Sincronizando…',
    synced: 'Google ✓',
    reconnect: 'Reconectar Google',
    error: 'Error de sync ↻',
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
              className={`gsync-btn ${gstatus}`}
              onClick={gsyncClick}
              disabled={gstatus === 'syncing'}
              title={
                gstatus === 'error'
                  ? `Error al sincronizar: ${gerror ?? 'desconocido'} — tocá para reintentar`
                  : gstatus === 'synced'
                    ? 'Calendario "UTDT" al día · tocá para forzar un sync'
                    : 'Sincronizar en vivo con tu Google Calendar (calendario "UTDT")'
              }
            >
              {gsyncLabel[gstatus]}
            </button>
            {(gstatus === 'synced' || gstatus === 'error') && (
              <button
                className="icon-btn"
                onClick={gsyncOff}
                title="Desconectar Google"
                aria-label="Desconectar Google"
              >
                ⏻
              </button>
            )}
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
