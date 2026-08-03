// Chequeos independientes del motor contra conteos derivados a mano.
// Correr con: npm test

import { COURSES } from '../src/data'
import { buildEngine, query, selectionMask, hasBit, matching } from '../src/engine'

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
const engine = buildEngine(COURSES, allIds)
const posOf = (id: string) => {
  const p = engine.pos.get(id)
  if (p === undefined) throw new Error('slot desconocido: ' + id)
  return p
}

// 1. Estructura
assert(engine.slots.length === 31, `31 slots en total (got ${engine.slots.length})`)
assert(engine.totalPicks === 14, `14 clases a elegir (got ${engine.totalPicks})`)

// 2. Conteo total derivado a mano:
//    RIF práctica libre (×4) · jueves RIF/OI teóricas en bloques opuestos (×2)
//    · OI teórica miércoles libre (×2) · (RIF teo martes, OI práctica) (×6)
//    · bloque TEA/EMI {T_ju, T_pra, E_pra} (×8) · HEA C(3,2) (×3) = 2304
const q0 = query(engine, 0n)
assert(q0.count === 2304, `2304 horarios completos válidos (got ${q0.count})`)

// 3. Imposibles desde el arranque:
//    TEA teórica Lu S2 choca con EMI teórica Lu (única opción de EMI ese día);
//    en consecuencia TEA teórica Lu queda fija en S1 13:45 y la práctica Lu de
//    TEA (13:45) también muere.
const excluded = new Set(['tea-teo-lu-s2', 'tea-pra-lu-s2'])
for (const [id, p] of engine.pos)
  assert(
    hasBit(q0.avail, p) === !excluded.has(id),
    `${excluded.has(id) ? 'imposible' : 'disponible'} al inicio: ${id}`,
  )

// 4. Forzadas desde el arranque: exactamente las dos teóricas de EMI (opción
//    única) y la teórica de TEA del lunes S1.
const forcedIds = new Set(['emi-teo-lu-s1', 'emi-teo-ma-s1', 'tea-teo-lu-s1'])
for (const [id, p] of engine.pos)
  assert(hasBit(q0.forced, p) === forcedIds.has(id), `forzada(${id}) === ${forcedIds.has(id)}`)

// 5. Elegir RIF teórica Ma S2 (11:30) → OI práctica Ma S1 (11:30) muere,
//    la otra opción de martes de RIF muere (grupo lleno), quedan 1152.
const m1 = selectionMask(engine, ['rif-teo-ma-s2'])
const q1 = query(engine, m1)
assert(q1.count === 1152, `1152 tras RIF teórica Ma S2 (got ${q1.count})`)
assert(!hasBit(q1.avail, posOf('oi-pra-ma-s1')), 'OI práctica Ma 11:30 fuera')
assert(!hasBit(q1.avail, posOf('rif-teo-ma-s1')), 'RIF teórica Ma S1 fuera (grupo lleno)')
assert(hasBit(q1.avail, posOf('oi-pra-ma-s2')), 'OI práctica Ma 9:45 sigue disponible')

// 6. + TEA práctica Ju S1 (15:30) → fuerza TEA teórica Ju S1 (13:45), quedan 288.
const m2 = selectionMask(engine, ['rif-teo-ma-s2', 'tea-pra-ju-s1'])
const q2 = query(engine, m2)
assert(q2.count === 288, `288 tras sumar TEA práctica Ju S1 (got ${q2.count})`)
assert(hasBit(q2.forced, posOf('tea-teo-ju-s1')), 'TEA teórica Ju 13:45 forzada')
assert(!hasBit(q2.avail, posOf('tea-teo-ju-s2')), 'TEA teórica Ju 15:30 fuera')

// 7. HEA: con 2 días elegidos, el tercero muere.
const q3 = query(engine, selectionMask(engine, ['hea-teo-lu', 'hea-teo-ma']))
assert(!hasBit(q3.avail, posOf('hea-teo-ju')), 'HEA tercer día fuera con 2 elegidos')

// 8. Selección completa → exactamente 1 horario.
const full = [
  'emi-teo-lu-s1', 'emi-teo-ma-s1', 'emi-pra-mi-s1',
  'tea-teo-lu-s1', 'tea-teo-ju-s1', 'tea-pra-mi-s1',
  'rif-teo-ma-s1', 'rif-teo-ju-s1', 'rif-pra-lu-s1',
  'oi-teo-mi-s1', 'oi-teo-ju-s1', 'oi-pra-vi-s2',
  'hea-teo-lu', 'hea-teo-ma',
]
const qf = query(engine, selectionMask(engine, full))
assert(qf.count === 1, `selección completa → 1 horario (got ${qf.count})`)

// 9. Sin OI: RIF(16) × bloque TEA/EMI(8) × HEA(3) = 384.
const e2 = buildEngine(COURSES, new Set([...allIds].filter((id) => id !== 'oi')))
const q4 = query(e2, 0n)
assert(q4.count === 384, `384 horarios sin OI (got ${q4.count})`)

// 10. Ningún horario válido tiene superposiciones (chequeo por fuerza bruta).
let clashes = 0
for (const s of matching(engine, 0n)) {
  const slots = engine.slots.filter((_, i) => hasBit(s, i))
  for (let i = 0; i < slots.length; i++)
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i]
      const b = slots[j]
      if (a.day === b.day && a.start < b.end && b.start < a.end) clashes++
    }
}
assert(clashes === 0, 'ningún horario válido tiene superposiciones')

// 11. Todo horario válido tiene exactamente 14 clases.
let badSizes = 0
for (const s of matching(engine, 0n)) {
  let bits = 0
  for (let i = 0; i < engine.slots.length; i++) if (hasBit(s, i)) bits++
  if (bits !== 14) badSizes++
}
assert(badSizes === 0, 'todo horario válido tiene 14 clases')

if (failures) {
  console.error(`\n${failures} chequeo(s) fallaron`)
  process.exit(1)
} else {
  console.log('\nTodos los chequeos pasaron ✓')
}
