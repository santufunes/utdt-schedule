// Motor de combinaciones: enumera todos los horarios completos válidos (sin
// superposiciones) para las materias activas y responde, dada una selección
// parcial, qué opciones siguen pudiendo formar parte de algún horario completo.
//
// Cada horario completo se representa como un bitmask (bigint) sobre las
// posiciones de los slots activos. Con ~2.300 horarios válidos, cada consulta
// es un barrido lineal instantáneo.

import type { Course, Slot } from './data'

export interface Engine {
  slots: Slot[]
  pos: Map<string, number> // slot id -> posición de bit
  schedules: bigint[] // todos los horarios completos sin choques
  totalPicks: number // cuántas clases hay que elegir en total
}

export interface Query {
  count: number // horarios completos compatibles con la selección
  avail: bigint // slots que aparecen en al menos uno de esos horarios
  forced: bigint // slots que aparecen en todos esos horarios
}

export const overlaps = (a: Slot, b: Slot): boolean =>
  a.day === b.day && a.start < b.end && b.start < a.end

export function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]]
  if (arr.length < k) return []
  const [head, ...rest] = arr
  return [
    ...combinations(rest, k - 1).map((c) => [head, ...c]),
    ...combinations(rest, k),
  ]
}

export function buildEngine(courses: Course[], activeIds: ReadonlySet<string>): Engine {
  const active = courses.filter((c) => activeIds.has(c.id))
  const slots = active.flatMap((c) => c.groups.flatMap((g) => g.slots))
  const pos = new Map(slots.map((s, i) => [s.id, i] as const))
  const n = slots.length

  const conflict: boolean[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => i !== j && overlaps(slots[i], slots[j])),
  )

  // Por materia: todas las formas de cumplir sus grupos (sin choques internos,
  // p. ej. teórica y práctica de la misma materia en el mismo bloque).
  const perCourse: number[][][] = active.map((c) => {
    let acc: number[][] = [[]]
    for (const g of c.groups) {
      const opts = combinations(
        g.slots.map((s) => pos.get(s.id)!),
        g.pick,
      )
      const next: number[][] = []
      for (const a of acc) for (const o of opts) next.push([...a, ...o])
      acc = next
    }
    return acc.filter((assign) => {
      for (let i = 0; i < assign.length; i++)
        for (let j = i + 1; j < assign.length; j++)
          if (conflict[assign[i]][assign[j]]) return false
      return true
    })
  })

  const schedules: bigint[] = []
  const chosen: number[] = []
  const dfs = (ci: number) => {
    if (ci === perCourse.length) {
      let m = 0n
      for (const p of chosen) m |= 1n << BigInt(p)
      schedules.push(m)
      return
    }
    outer: for (const assign of perCourse[ci]) {
      for (const a of assign) for (const b of chosen) if (conflict[a][b]) continue outer
      chosen.push(...assign)
      dfs(ci + 1)
      chosen.length -= assign.length
    }
  }
  dfs(0)

  const totalPicks = active.reduce(
    (t, c) => t + c.groups.reduce((u, g) => u + g.pick, 0),
    0,
  )
  return { slots, pos, schedules, totalPicks }
}

export function selectionMask(engine: Engine, selectedIds: Iterable<string>): bigint {
  let m = 0n
  for (const id of selectedIds) {
    const p = engine.pos.get(id)
    if (p !== undefined) m |= 1n << BigInt(p)
  }
  return m
}

export function query(engine: Engine, selected: bigint): Query {
  let count = 0
  let avail = 0n
  let forced = -1n // todos los bits en 1; se va acotando con AND
  for (const s of engine.schedules) {
    if ((s & selected) === selected) {
      count++
      avail |= s
      forced &= s
    }
  }
  if (count === 0) forced = 0n
  return { count, avail, forced }
}

export const hasBit = (m: bigint, p: number): boolean => ((m >> BigInt(p)) & 1n) === 1n

export function matching(engine: Engine, selected: bigint): bigint[] {
  return engine.schedules.filter((s) => (s & selected) === selected)
}

export function slotIdsFromMask(engine: Engine, mask: bigint): string[] {
  return engine.slots.filter((_, i) => hasBit(mask, i)).map((s) => s.id)
}
