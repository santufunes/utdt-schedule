import { useEffect, useMemo, useRef, useState } from 'react'
import { COURSES, FOOTNOTES, DAY_FULL, fmt } from './data'
import type { Course, Day, Group, Slot } from './data'
import { buildEngine, hasBit, matching, query, selectionMask, slotIdsFromMask } from './engine'
import { downloadICS } from './ics'
import {
  decideSyncDirection,
  disconnect,
  ensureToken,
  fetchCloudOverridesJson,
  fetchCloudSelection,
  hasValidToken,
  pushCloudOverridesJson,
  queueSync,
} from './gsync'
import {
  EMPTY_OVERRIDES,
  applyOverrides,
  isEmptyOverrides,
  normalizeOverrides,
  overridesKey,
} from './overrides'
import type { Overrides, SlotPatch } from './overrides'
import CourseCard from './components/CourseCard'
import Calendar from './components/Calendar'
import type { CalendarEntry } from './components/Calendar'
import SlotEditor from './components/SlotEditor'
import type { SlotEditorValues } from './components/SlotEditor'

const STORAGE_KEY = 'utdt-horarios-2026-2s'
const GSYNC_KEY = 'utdt-horarios-gsync'
const LAST_SYNCED_KEY = 'utdt-horarios-last-synced'
const OV_LAST_SYNCED_KEY = 'utdt-horarios-ov-last-synced'

const EMPTY_OV_KEY = overridesKey(EMPTY_OVERRIDES)

type GStatus = 'off' | 'syncing' | 'synced' | 'reconnect' | 'error'

type EditorState =
  | { mode: 'edit'; slot: Slot; course: Course }
  | { mode: 'add'; group: Group; course: Course }
  | null

interface Persisted {
  active: string[]
  selected: string[]
  overrides?: unknown
}

const slotCourseOf = (courses: Course[]): Map<string, string> =>
  new Map(courses.flatMap((c) => c.groups.flatMap((g) => g.slots.map((s) => [s.id, c.id] as const))))

function loadState(): { active: Set<string>; selected: Set<string>; overrides: Overrides } {
  const allCourses = new Set(COURSES.map((c) => c.id))
  const fallback = { active: allCourses, selected: new Set<string>(), overrides: EMPTY_OVERRIDES }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<Persisted>
    if (!Array.isArray(parsed.active) || !Array.isArray(parsed.selected)) return fallback
    const overrides = normalizeOverrides(parsed.overrides) ?? EMPTY_OVERRIDES
    const slotCourse = slotCourseOf(applyOverrides(COURSES, overrides))
    const active = new Set(parsed.active.filter((id) => allCourses.has(id)))
    const selected = new Set(
      parsed.selected.filter((id) => {
        const courseId = slotCourse.get(id)
        return courseId !== undefined && active.has(courseId)
      }),
    )
    return { active, selected, overrides }
  } catch {
    return fallback
  }
}

export default function App() {
  const [init] = useState(loadState)
  const [active, setActive] = useState(init.active)
  const [selected, setSelected] = useState(init.selected)
  const [overrides, setOverrides] = useState<Overrides>(init.overrides)
  const [editMode, setEditMode] = useState(false)
  const [editor, setEditor] = useState<EditorState>(null)
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

  const courses = useMemo(() => applyOverrides(COURSES, overrides), [overrides])

  // Refs siempre al día: los timers y pull() leen el estado VIVO al momento
  // de actuar, no el que capturó su closure (evita pisar ediciones hechas
  // durante una espera de red).
  const selectedRef = useRef(selected)
  selectedRef.current = selected
  const overridesRef = useRef(overrides)
  overridesRef.current = overrides
  const coursesRef = useRef(courses)
  coursesRef.current = courses
  const slotCourse = useMemo(() => slotCourseOf(courses), [courses])
  const courseById = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses])
  const editedIds = useMemo(() => new Set(Object.keys(overrides.edited)), [overrides])
  const removedByGroup = useMemo(() => {
    const removed = new Set(overrides.removed)
    const map = new Map<string, Slot[]>()
    for (const c of COURSES)
      for (const g of c.groups) {
        const gone = g.slots.filter((s) => removed.has(s.id))
        if (gone.length > 0) map.set(g.id, gone)
      }
    return map
  }, [overrides])

  useEffect(() => {
    const data: Persisted = {
      active: [...active],
      selected: [...selected],
      overrides: isEmptyOverrides(overrides) ? undefined : overrides,
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // almacenamiento no disponible: la app funciona sin persistencia
    }
  }, [active, selected, overrides])

  const engine = useMemo(() => buildEngine(courses, active), [courses, active])
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
        setSelected((sel) => new Set([...sel].filter((s) => slotCourse.get(s) !== id)))
      } else {
        next.add(id)
      }
      return next
    })
  }

  const clearCourse = (id: string) => {
    setSelected((sel) => new Set([...sel].filter((s) => slotCourse.get(s) !== id)))
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

  /* ─── edición del dataset ─────────────────────────────────────────── */

  const baseSlotById = useMemo(
    () => new Map(COURSES.flatMap((c) => c.groups.flatMap((g) => g.slots.map((s) => [s.id, s])))),
    [],
  )

  const saveEditor = (values: SlotEditorValues) => {
    if (!editor) return
    if (editor.mode === 'add') {
      const group = editor.group
      const kind = group.slots[0]?.kind ?? (group.label.startsWith('Teórica') ? 'T' : 'P')
      const id = `x-${group.id}-${Date.now().toString(36)}`
      setOverrides((o) => ({
        ...o,
        added: [...o.added, { id, groupId: group.id, kind, ...values }],
      }))
    } else {
      const { slot } = editor
      const custom = overrides.added.find((a) => a.id === slot.id)
      if (custom) {
        setOverrides((o) => ({
          ...o,
          added: o.added.map((a) => (a.id === slot.id ? { ...a, ...values } : a)),
        }))
      } else {
        const base = baseSlotById.get(slot.id)
        if (!base || overrides.removed.includes(slot.id)) {
          // El slot desapareció (p. ej. un pull en segundo plano adoptó
          // overrides de otro dispositivo): cerrar sin romper nada.
          setEditor(null)
          return
        }
        const patch: SlotPatch = {}
        if (values.day !== base.day) patch.day = values.day
        if (values.start !== base.start) patch.start = values.start
        if (values.end !== base.end) patch.end = values.end
        if (values.room !== base.room) patch.room = values.room
        if (values.section !== base.section) patch.section = values.section
        setOverrides((o) => {
          const edited = { ...o.edited }
          if (Object.keys(patch).length === 0) delete edited[slot.id]
          else edited[slot.id] = patch
          return { ...o, edited }
        })
      }
    }
    setEditor(null)
  }

  const restoreOriginal = () => {
    if (!editor || editor.mode !== 'edit') return
    const id = editor.slot.id
    setOverrides((o) => {
      const edited = { ...o.edited }
      delete edited[id]
      return { ...o, edited }
    })
    setEditor(null)
  }

  const removeSlot = (slot: Slot) => {
    setSelected((sel) => {
      const next = new Set(sel)
      next.delete(slot.id)
      return next
    })
    setOverrides((o) =>
      o.added.some((a) => a.id === slot.id)
        ? { ...o, added: o.added.filter((a) => a.id !== slot.id) }
        : { ...o, removed: [...o.removed, slot.id] },
    )
  }

  const restoreSlot = (id: string) => {
    setOverrides((o) => {
      const edited = { ...o.edited }
      delete edited[id]
      return { ...o, edited, removed: o.removed.filter((r) => r !== id) }
    })
  }

  /* ─── sync con Google ─────────────────────────────────────────────── */

  const markConnected = () => {
    setGerror(null)
    try {
      localStorage.setItem(GSYNC_KEY, '1')
    } catch {
      // sin almacenamiento: la conexión no persiste entre visitas
    }
  }

  const readLS = (key: string): string | null => {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  }
  const writeLS = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value)
    } catch {
      // nada
    }
  }

  const readLastSynced = (): string[] | null => {
    const raw = readLS(LAST_SYNCED_KEY)
    try {
      return raw ? (JSON.parse(raw) as string[]) : null
    } catch {
      return null
    }
  }

  const writeLastSynced = (ids: Iterable<string>) =>
    writeLS(LAST_SYNCED_KEY, JSON.stringify([...ids].sort()))

  const pushNow = async (ids: Set<string>, effCourses: Course[]) => {
    setGstatus('syncing')
    try {
      const effSlots = effCourses.flatMap((c) => c.groups.flatMap((g) => g.slots))
      const pushable = effSlots.filter((s) => ids.has(s.id))
      await queueSync(pushable, effCourses)
      writeLastSynced(pushable.map((s) => s.id))
      setGstatus('synced')
      markConnected()
    } catch (e) {
      setGstatus('error')
      setGerror(e instanceof Error ? e.message : String(e))
    }
  }

  const pushOverridesNow = async (o: Overrides) => {
    await pushCloudOverridesJson(JSON.stringify(o))
    writeLS(OV_LAST_SYNCED_KEY, overridesKey(o))
  }

  // Reconcilia con el calendario (fuente de verdad entre dispositivos):
  // primero las ediciones del dataset, después la selección.
  const adopting = useRef(false)
  const adoptingOv = useRef(false)
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
      // 1. overrides del dataset (estado VIVO leído después de cada await)
      const cloudJson = await fetchCloudOverridesJson()
      const cloudOv = cloudJson
        ? (normalizeOverrides(JSON.parse(cloudJson)) ?? EMPTY_OVERRIDES)
        : EMPTY_OVERRIDES
      const liveOv = overridesRef.current
      const localKey = overridesKey(liveOv)
      const cloudKey = overridesKey(cloudOv)
      const lastOvRaw = readLS(OV_LAST_SYNCED_KEY)
      const asArr = (k: string) => (k === EMPTY_OV_KEY ? [] : [k])
      const ovDir = decideSyncDirection(
        asArr(localKey),
        lastOvRaw === null ? null : asArr(lastOvRaw),
        asArr(cloudKey),
      )
      let effOverrides = liveOv
      if (ovDir === 'adopt-cloud') {
        adoptingOv.current = true
        effOverrides = cloudOv
        setOverrides(cloudOv)
        setEditor(null) // el editor podría apuntar a un slot que ya no existe
        writeLS(OV_LAST_SYNCED_KEY, cloudKey)
      } else if (ovDir === 'push-local') {
        await pushOverridesNow(liveOv)
      } else {
        writeLS(OV_LAST_SYNCED_KEY, localKey)
      }
      const effCourses = applyOverrides(COURSES, effOverrides)
      const effSlotCourse = slotCourseOf(effCourses)

      // 2. selección: podar ids que el dataset efectivo ya no tiene y
      //    reconciliar sobre el estado vivo.
      const cloud = await fetchCloudSelection(effCourses)
      let live = selectedRef.current
      if ([...live].some((id) => !effSlotCourse.has(id))) {
        live = new Set([...live].filter((id) => effSlotCourse.has(id)))
        adopting.current = true
        setSelected(live)
      }
      const dir = decideSyncDirection([...live], readLastSynced(), cloud)
      if (dir === 'adopt-cloud') {
        adopting.current = true
        setActive((prev) => {
          const next = new Set(prev)
          for (const id of cloud) next.add(effSlotCourse.get(id)!)
          return next
        })
        setSelected(new Set(cloud))
        writeLastSynced(cloud)
        setGstatus('synced')
        markConnected()
      } else if (dir === 'push-local') {
        await pushNow(live, effCourses)
      } else {
        writeLastSynced(live)
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
  }, [gstatus, selected, active, overrides])

  // Auto-push (con debounce) ante cada edición mientras esté conectado.
  useEffect(() => {
    if (gstatus === 'off' || gstatus === 'reconnect') return
    if (adopting.current) {
      adopting.current = false
      return
    }
    const t = setTimeout(() => {
      // estado vivo al momento de disparar, no el capturado al programar
      void pushNow(selectedRef.current, coursesRef.current)
    }, 2000)
    return () => clearTimeout(t)
    // pushNow se recrea por render; alcanza con reaccionar a la selección.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, active])

  // Auto-push de las ediciones del dataset (y refresco de eventos afectados).
  useEffect(() => {
    if (gstatus === 'off' || gstatus === 'reconnect') return
    if (adoptingOv.current) {
      adoptingOv.current = false
      return
    }
    const t = setTimeout(() => {
      void (async () => {
        setGstatus('syncing')
        try {
          await pushOverridesNow(overridesRef.current)
          await pushNow(selectedRef.current, coursesRef.current)
        } catch (e) {
          setGstatus('error')
          setGerror(e instanceof Error ? e.message : String(e))
        }
      })()
    }, 2000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overrides])

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
      localStorage.removeItem(OV_LAST_SYNCED_KEY)
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
      const course = courseById.get(slot.courseId)!
      entries.push({ slot, color: course.color, short: course.short, ghost })
    }
  }
  const hasGhosts = entries.some((e) => e.ghost)

  const scheduleText = () => {
    const byDay = new Map<Day, { start: number; text: string }[]>()
    for (const slot of engine.slots) {
      if (!selected.has(slot.id)) continue
      const course = courseById.get(slot.courseId)!
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
              className={`icon-btn${editMode ? ' toggled' : ''}`}
              onClick={() => setEditMode((v) => !v)}
              title={
                editMode
                  ? 'Salir del modo edición'
                  : 'Editar horarios y aulas, agregar o quitar opciones'
              }
              aria-label="Modo edición"
              aria-pressed={editMode}
            >
              ✎
            </button>
            <button
              className="icon-btn"
              onClick={autocomplete}
              disabled={q.count === 0 || complete || editMode}
              title="Completar al azar con una combinación válida"
              aria-label="Completar al azar"
            >
              🎲
            </button>
            <button
              className="icon-btn"
              onClick={reset}
              disabled={(selected.size === 0 && active.size === COURSES.length) || editMode}
              title="Reiniciar la selección"
              aria-label="Reiniciar"
            >
              ↺
            </button>
          </div>
        </div>
      </header>

      <main className="layout">
        <div className="cards-col">
          {editMode && (
            <div className="banner info">
              Modo edición: tocá una opción para cambiar día, hora, aula o sección; ✕ la quita
              y «+ agregar» crea una nueva. Todo se sincroniza entre tus dispositivos.
            </div>
          )}
          {q.count === 0 && (
            <div className="banner danger" role="alert">
              Sin combinaciones posibles con esta selección. Destildá alguna clase para
              destrabar el resto.
            </div>
          )}
          {complete && !editMode && (
            <div className="banner success">
              <span>¡Horario completo, sin superposiciones! ✓</span>
              <span className="banner-actions">
                <button className="pill-btn" onClick={copySchedule}>
                  {copied ? 'Copiado ✓' : 'Copiar horario'}
                </button>
                <button
                  className="pill-btn"
                  onClick={() =>
                    downloadICS(
                      engine.slots.filter((s) => selected.has(s.id)),
                      courses,
                    )
                  }
                  title="Todo el semestre (03/08–27/11), sin feriados ni semanas de parciales, sin alertas"
                >
                  Descargar .ics
                </button>
              </span>
            </div>
          )}
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              engine={engine}
              q={q}
              selected={selected}
              isActive={active.has(course.id)}
              editMode={editMode}
              editedIds={editedIds}
              removedByGroup={removedByGroup}
              onToggleSlot={toggleSlot}
              onToggleCourse={toggleCourse}
              onClear={clearCourse}
              onOpenEditor={(slot) => setEditor({ mode: 'edit', slot, course })}
              onRemoveSlot={removeSlot}
              onRestoreSlot={restoreSlot}
              onAddOption={(group, c) => setEditor({ mode: 'add', group, course: c })}
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
            legend={courses
              .filter((c) => active.has(c.id))
              .map((c) => ({
                short: c.short,
                color: c.color,
              }))}
            showGhostHint={hasGhosts}
          />
        </aside>
      </main>

      {editor && (
        <SlotEditor
          title={
            editor.mode === 'add'
              ? `${editor.course.short} · ${editor.group.label} · nueva opción`
              : `${editor.course.short} · editar opción`
          }
          initial={
            editor.mode === 'add'
              ? {
                  day: (editor.group.slots[0]?.day ?? 1) as Day,
                  start: editor.group.slots[0]?.start ?? 9 * 60 + 45,
                  end: editor.group.slots[0]?.end ?? 11 * 60 + 20,
                  room: '',
                  section: null,
                }
              : {
                  day: editor.slot.day,
                  start: editor.slot.start,
                  end: editor.slot.end,
                  room: editor.slot.room,
                  section: editor.slot.section,
                }
          }
          onSave={saveEditor}
          onCancel={() => setEditor(null)}
          onRestore={
            editor.mode === 'edit' && editedIds.has(editor.slot.id) ? restoreOriginal : undefined
          }
        />
      )}
    </div>
  )
}

export type { Slot }
