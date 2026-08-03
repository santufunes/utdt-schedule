import type { CSSProperties } from 'react'
import { DAY_ABBR, fmt } from '../data'
import type { Course, Group, Slot } from '../data'
import { hasBit } from '../engine'
import type { Engine, Query } from '../engine'

interface Props {
  course: Course
  engine: Engine
  q: Query
  selected: Set<string>
  isActive: boolean
  onToggleSlot: (id: string) => void
  onToggleCourse: (id: string) => void
  onClear: (id: string) => void
}

function Chip({
  slot,
  courseShort,
  groupLabel,
  engine,
  q,
  selected,
  onToggleSlot,
}: {
  slot: Slot
  courseShort: string
  groupLabel: string
  engine: Engine
  q: Query
  selected: Set<string>
  onToggleSlot: (id: string) => void
}) {
  const p = engine.pos.get(slot.id)!
  const isSel = selected.has(slot.id)
  const isAvail = hasBit(q.avail, p)
  const isForced = q.count > 0 && !isSel && hasBit(q.forced, p)
  const disabled = !isSel && !isAvail

  return (
    <button
      className={`chip${isSel ? ' sel' : ''}${disabled ? ' out' : ''}${isForced ? ' forced' : ''}`}
      disabled={disabled}
      aria-pressed={isSel}
      aria-label={`${courseShort} · ${groupLabel} · ${DAY_ABBR[slot.day]} ${fmt(slot.start)}–${fmt(
        slot.end,
      )} · ${slot.room}${slot.section ? ` · sección ${slot.section}` : ''}`}
      onClick={() => onToggleSlot(slot.id)}
      title={
        disabled
          ? 'Incompatible con tu selección actual'
          : slot.note ?? (isSel ? 'Sacar del horario' : 'Sumar al horario')
      }
    >
      <span className="chip-when">
        {DAY_ABBR[slot.day]} {fmt(slot.start)}–{fmt(slot.end)}
      </span>
      <span className="chip-where">
        {slot.room}
        {slot.section ? ` · S${slot.section}` : ''}
        {slot.note ? ' *' : ''}
      </span>
      {isForced && <span className="chip-badge">única opción</span>}
      {isSel && (
        <span className="chip-check" aria-hidden="true">
          ✓
        </span>
      )}
    </button>
  )
}

function GroupRow({
  group,
  courseShort,
  engine,
  q,
  selected,
  onToggleSlot,
}: {
  group: Group
  courseShort: string
  engine: Engine
  q: Query
  selected: Set<string>
  onToggleSlot: (id: string) => void
}) {
  const nSel = group.slots.filter((s) => selected.has(s.id)).length
  const full = nSel === group.pick
  return (
    <div className="group">
      <div className="group-label">
        <span>{group.label}</span>
        <span className={`pick-hint${full ? ' done' : ''}`}>
          {full
            ? 'listo ✓'
            : group.pick === 1
              ? 'elegí 1'
              : `elegí ${group.pick} de ${group.slots.length} · ${nSel}/${group.pick}`}
        </span>
      </div>
      <div className="chips">
        {group.slots.map((slot) => (
          <Chip
            key={slot.id}
            slot={slot}
            courseShort={courseShort}
            groupLabel={group.label}
            engine={engine}
            q={q}
            selected={selected}
            onToggleSlot={onToggleSlot}
          />
        ))}
      </div>
    </div>
  )
}

export default function CourseCard({
  course,
  engine,
  q,
  selected,
  isActive,
  onToggleSlot,
  onToggleCourse,
  onClear,
}: Props) {
  const nSel = course.groups.reduce(
    (acc, g) => acc + g.slots.filter((s) => selected.has(s.id)).length,
    0,
  )
  const nPicks = course.groups.reduce((acc, g) => acc + g.pick, 0)

  return (
    <section
      className={`card${isActive ? '' : ' card-off'}`}
      style={{ '--c': course.color } as CSSProperties}
    >
      <header className="card-head">
        <span className="dot" aria-hidden="true" />
        <div className="card-title">
          <h2>
            {course.short} <small>{course.code}</small>
            {isActive && <span className={`card-count${nSel === nPicks ? ' done' : ''}`}>{nSel}/{nPicks}</span>}
          </h2>
          <p>{course.name}</p>
          <p className="people">{course.people}</p>
        </div>
        <div className="card-actions">
          {isActive && nSel > 0 && (
            <button className="ghost-btn" onClick={() => onClear(course.id)}>
              limpiar
            </button>
          )}
          <label className="switch" title={isActive ? 'Excluir materia del armado' : 'Incluir materia'}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={() => onToggleCourse(course.id)}
              aria-label={`Incluir ${course.short}`}
            />
            <span className="slider" aria-hidden="true" />
          </label>
        </div>
      </header>
      {isActive && course.note && <p className="card-note">{course.note}</p>}
      {isActive ? (
        course.groups.map((group) => (
          <GroupRow
            key={group.id}
            group={group}
            courseShort={course.short}
            engine={engine}
            q={q}
            selected={selected}
            onToggleSlot={onToggleSlot}
          />
        ))
      ) : (
        <p className="card-excluded">Materia excluida del armado.</p>
      )}
    </section>
  )
}
