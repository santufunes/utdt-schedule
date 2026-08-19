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
  editMode: boolean
  editedIds: Set<string>
  removedByGroup: Map<string, Slot[]>
  onToggleSlot: (id: string) => void
  onToggleCourse: (id: string) => void
  onClear: (id: string) => void
  onOpenEditor: (slot: Slot) => void
  onRemoveSlot: (slot: Slot) => void
  onRestoreSlot: (id: string) => void
  onAddOption: (group: Group, course: Course) => void
}

function Chip({
  slot,
  courseShort,
  groupLabel,
  engine,
  q,
  selected,
  editMode,
  edited,
  canRemove,
  onToggleSlot,
  onOpenEditor,
  onRemoveSlot,
}: {
  slot: Slot
  courseShort: string
  groupLabel: string
  engine: Engine
  q: Query
  selected: Set<string>
  editMode: boolean
  edited: boolean
  canRemove: boolean
  onToggleSlot: (id: string) => void
  onOpenEditor: (slot: Slot) => void
  onRemoveSlot: (slot: Slot) => void
}) {
  const p = engine.pos.get(slot.id)!
  const isSel = selected.has(slot.id)
  const isAvail = hasBit(q.avail, p)
  const isForced = q.count > 0 && !isSel && hasBit(q.forced, p)
  const disabled = !isSel && !isAvail

  return (
    <span className="chip-wrap">
      <button
        className={`chip${isSel ? ' sel' : ''}${disabled && !editMode ? ' out' : ''}${
          isForced && !editMode ? ' forced' : ''
        }${editMode ? ' editable' : ''}`}
        disabled={disabled && !editMode}
        aria-pressed={!editMode && isSel}
        aria-label={`${courseShort} · ${groupLabel} · ${DAY_ABBR[slot.day]} ${fmt(slot.start)}–${fmt(
          slot.end,
        )} · ${slot.room}${slot.section ? ` · sección ${slot.section}` : ''}${
          editMode ? ' · editar' : ''
        }`}
        onClick={() => (editMode ? onOpenEditor(slot) : onToggleSlot(slot.id))}
        title={
          editMode
            ? 'Editar día, hora o aula'
            : disabled
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
          {edited ? ' ✎' : slot.note ? ' *' : ''}
        </span>
        {isForced && !editMode && <span className="chip-badge">única opción</span>}
        {isSel && !editMode && (
          <span className="chip-check" aria-hidden="true">
            ✓
          </span>
        )}
      </button>
      {editMode && (
        <button
          className="chip-del"
          onClick={() => onRemoveSlot(slot)}
          disabled={!canRemove}
          title={canRemove ? 'Quitar esta opción' : 'No se puede: el grupo quedaría sin opciones suficientes'}
          aria-label={`Quitar ${courseShort} ${DAY_ABBR[slot.day]} ${fmt(slot.start)}`}
        >
          ✕
        </button>
      )}
    </span>
  )
}

function GroupRow({
  group,
  course,
  engine,
  q,
  selected,
  editMode,
  editedIds,
  removed,
  onToggleSlot,
  onOpenEditor,
  onRemoveSlot,
  onRestoreSlot,
  onAddOption,
}: {
  group: Group
  course: Course
  engine: Engine
  q: Query
  selected: Set<string>
  editMode: boolean
  editedIds: Set<string>
  removed: Slot[]
  onToggleSlot: (id: string) => void
  onOpenEditor: (slot: Slot) => void
  onRemoveSlot: (slot: Slot) => void
  onRestoreSlot: (id: string) => void
  onAddOption: (group: Group, course: Course) => void
}) {
  const nSel = group.slots.filter((s) => selected.has(s.id)).length
  const full = nSel === group.pick
  const canRemove = group.slots.length > group.pick
  return (
    <div className="group">
      <div className="group-label">
        <span>{group.label}</span>
        <span className={`pick-hint${full && !editMode ? ' done' : ''}`}>
          {editMode
            ? `elegí ${group.pick}`
            : full
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
            courseShort={course.short}
            groupLabel={group.label}
            engine={engine}
            q={q}
            selected={selected}
            editMode={editMode}
            edited={editedIds.has(slot.id)}
            canRemove={canRemove}
            onToggleSlot={onToggleSlot}
            onOpenEditor={onOpenEditor}
            onRemoveSlot={onRemoveSlot}
          />
        ))}
        {editMode &&
          removed.map((slot) => (
            <button
              key={slot.id}
              className="chip removed-ghost"
              onClick={() => onRestoreSlot(slot.id)}
              title="Restaurar esta opción original"
            >
              <span className="chip-when">
                {DAY_ABBR[slot.day]} {fmt(slot.start)}–{fmt(slot.end)}
              </span>
              <span className="chip-where">{slot.room} · restaurar ↩</span>
            </button>
          ))}
        {editMode && (
          <button
            className="chip add-chip"
            onClick={() => onAddOption(group, course)}
            title="Agregar una opción nueva a este grupo"
          >
            <span className="chip-when">+ agregar</span>
            <span className="chip-where">opción nueva</span>
          </button>
        )}
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
  editMode,
  editedIds,
  removedByGroup,
  onToggleSlot,
  onToggleCourse,
  onClear,
  onOpenEditor,
  onRemoveSlot,
  onRestoreSlot,
  onAddOption,
}: Props) {
  const nSel = course.groups.reduce(
    (acc, g) => acc + g.slots.filter((s) => selected.has(s.id)).length,
    0,
  )
  const nPicks = course.groups.reduce((acc, g) => acc + g.pick, 0)

  return (
    <section
      className={`card${isActive ? '' : ' card-off'}${editMode ? ' card-editing' : ''}`}
      style={{ '--c': course.color } as CSSProperties}
    >
      <header className="card-head">
        <span className="dot" aria-hidden="true" />
        <div className="card-title">
          <h2>
            {course.short} <small>{course.code}</small>
            {isActive && (
              <span className={`card-count${nSel === nPicks ? ' done' : ''}`}>
                {nSel}/{nPicks}
              </span>
            )}
          </h2>
          <p>{course.name}</p>
          <p className="people">{course.people}</p>
        </div>
        <div className="card-actions">
          {isActive && nSel > 0 && !editMode && (
            <button className="ghost-btn" onClick={() => onClear(course.id)}>
              limpiar
            </button>
          )}
          <label
            className="switch"
            title={isActive ? 'Excluir materia del armado' : 'Incluir materia'}
          >
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
      {isActive && course.note && !editMode && <p className="card-note">{course.note}</p>}
      {isActive ? (
        course.groups.map((group) => (
          <GroupRow
            key={group.id}
            group={group}
            course={course}
            engine={engine}
            q={q}
            selected={selected}
            editMode={editMode}
            editedIds={editedIds}
            removed={removedByGroup.get(group.id) ?? []}
            onToggleSlot={onToggleSlot}
            onOpenEditor={onOpenEditor}
            onRemoveSlot={onRemoveSlot}
            onRestoreSlot={onRestoreSlot}
            onAddOption={onAddOption}
          />
        ))
      ) : (
        <p className="card-excluded">Materia excluida del armado.</p>
      )}
    </section>
  )
}
