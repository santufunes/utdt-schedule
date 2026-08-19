// Chequeos de las ediciones de dataset (overrides) y su efecto en el motor.
// Correr con: npm test

import { COURSES } from '../src/data'
import { buildEngine, query } from '../src/engine'
import {
  EMPTY_OVERRIDES,
  applyOverrides,
  isEmptyOverrides,
  normalizeOverrides,
  overridesKey,
} from '../src/overrides'
import type { Overrides } from '../src/overrides'

let failures = 0
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failures++
    console.error('FAIL –', msg)
  } else {
    console.log('ok   –', msg)
  }
}

const allIds = new Set(COURSES.map((c) => c.id))
const slotsOf = (cs: typeof COURSES) => cs.flatMap((c) => c.groups.flatMap((g) => g.slots))

// 1. Sin overrides: dataset idéntico y 9984 combinaciones.
const base = applyOverrides(COURSES, EMPTY_OVERRIDES)
assert(slotsOf(base).length === 35, '35 slots sin overrides')
assert(query(buildEngine(base, allIds), 0n).count === 9984, '9984 combinaciones sin overrides')

// 2. Editar sólo el aula no cambia el conteo.
const roomEdit: Overrides = {
  v: 1,
  edited: { 'emi-teo-lu-s1': { room: 'SV999' } },
  removed: [],
  added: [],
}
const withRoom = applyOverrides(COURSES, roomEdit)
const slotRoom = slotsOf(withRoom).find((s) => s.id === 'emi-teo-lu-s1')!
assert(slotRoom.room === 'SV999', 'aula editada aplicada')
assert(slotRoom.start === 15 * 60 + 30, 'hora intacta al editar sólo aula')
assert(query(buildEngine(withRoom, allIds), 0n).count === 9984, 'conteo intacto con cambio de aula')

// 3. Quitar una práctica de RIF (factor libre 4→3): 9984·3/4 = 7488.
const removeOne: Overrides = { v: 1, edited: {}, removed: ['rif-pra-vi-s2'], added: [] }
const withRemoved = applyOverrides(COURSES, removeOne)
assert(slotsOf(withRemoved).length === 34, '34 slots tras quitar una opción')
assert(
  query(buildEngine(withRemoved, allIds), 0n).count === 7488,
  `7488 combinaciones sin RIF práctica Vi S2`,
)

// 4. Agregar una práctica de RIF en un hueco libre (Lu 8:00): factor 4→5 → 12480.
const addOne: Overrides = {
  v: 1,
  edited: {},
  removed: [],
  added: [
    {
      id: 'x-rif-pra-test',
      groupId: 'rif-pra',
      day: 1,
      start: 8 * 60,
      end: 9 * 60 + 35,
      room: 'A999',
      section: null,
      kind: 'P',
    },
  ],
}
const withAdded = applyOverrides(COURSES, addOne)
const rifPra = withAdded.find((c) => c.id === 'rif')!.groups.find((g) => g.id === 'rif-pra')!
assert(rifPra.slots.length === 5, 'RIF práctica con 5 opciones')
assert(rifPra.slots[0].id === 'x-rif-pra-test', 'opciones ordenadas por día/hora (Lu 8:00 primero)')
assert(rifPra.slots[0].courseId === 'rif', 'slot agregado hereda courseId')
assert(
  query(buildEngine(withAdded, allIds), 0n).count === 12480,
  '12480 combinaciones con la práctica extra',
)

// 5. Mover una teórica para crear un choque nuevo: EMI teórica Ma S1 a 17:15.
//    Ahora las dos opciones de EMI Ma están a las 17:15 y cualquiera pisa a
//    HEA Ma. Bloque EMI/TEA/HEA:
//    E_lu=S1 (15:30): T_lu=13:45; E_ma cualquiera de las 2 → HEA sólo {Lu,Ju}
//      → 2 × 1 × 16 = 32
//    E_lu=S2 (17:15): HEA pierde Lu y Ma → le queda sólo Ju → 0
//    Bloque = 32 → total 96·32 = 3072.
const moveOne: Overrides = {
  v: 1,
  edited: { 'emi-teo-ma-s1': { start: 17 * 60 + 15, end: 18 * 60 + 50 } },
  removed: [],
  added: [],
}
const withMoved = applyOverrides(COURSES, moveOne)
const movedCount = query(buildEngine(withMoved, allIds), 0n).count
assert(movedCount === 3072, `3072 combinaciones al mover EMI teórica Ma a 17:15 (got ${movedCount})`)

// 6. normalize: descarta basura y conserva lo válido; parche start>=end se ignora al aplicar.
const dirty = normalizeOverrides({
  v: 1,
  edited: { 'rif-teo-ma-s1': { room: '  M8  ', day: 9, start: 'x' }, bad: 'no' },
  removed: ['rif-pra-lu-s1', 42],
  added: [
    { id: 'x-1', groupId: 'hea-teo', day: 5, start: 600, end: 500, room: 'A1', section: null, kind: 'T' },
    { id: 'x-2', groupId: 'hea-teo', day: 5, start: 600, end: 695, room: 'A1', section: 1, kind: 'T' },
  ],
})!
assert(dirty !== null, 'normalize acepta el objeto')
assert(dirty.edited['rif-teo-ma-s1'].room === 'M8', 'room recortada')
assert(dirty.edited['rif-teo-ma-s1'].day === undefined, 'día inválido descartado')
const fracDay = normalizeOverrides({ v: 1, edited: { 'rif-teo-ma-s1': { day: 1.5 } }, removed: [], added: [] })!
assert(fracDay.edited['rif-teo-ma-s1'] === undefined, 'día fraccionario (1.5) descartado')
assert(dirty.removed.length === 1, 'removed filtrado')
assert(dirty.added.length === 1 && dirty.added[0].id === 'x-2', 'added inválido (fin<=inicio) descartado')
assert(normalizeOverrides({ v: 2 }) === null, 'versión desconocida → null')
assert(normalizeOverrides('nope') === null, 'no-objeto → null')

// 7. Parche corrupto con start >= end no rompe el slot al aplicar.
const badPatch: Overrides = {
  v: 1,
  edited: { 'rif-teo-ma-s1': { start: 13 * 60 } }, // start 13:00 > end 11:20 → se ignora
  removed: [],
  added: [],
}
const applied = slotsOf(applyOverrides(COURSES, badPatch)).find((s) => s.id === 'rif-teo-ma-s1')!
assert(applied.start === 9 * 60 + 45, 'parche inconsistente ignorado (slot original intacto)')

// 8. overridesKey estable ante orden distinto.
const a: Overrides = { v: 1, edited: { x: { room: 'A' }, y: { room: 'B' } }, removed: ['r1', 'r2'], added: [] }
const b: Overrides = { v: 1, edited: { y: { room: 'B' }, x: { room: 'A' } }, removed: ['r2', 'r1'], added: [] }
assert(overridesKey(a) === overridesKey(b), 'overridesKey no depende del orden')
assert(isEmptyOverrides(EMPTY_OVERRIDES) && !isEmptyOverrides(a), 'isEmptyOverrides')

if (failures) {
  console.error(`\n${failures} chequeo(s) fallaron`)
  process.exit(1)
} else {
  console.log('\nTodos los chequeos pasaron ✓')
}
