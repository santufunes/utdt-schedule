// Chequeos independientes del motor contra conteos derivados a mano.
// Correr con: npm test
//
// Derivación (con EMI Sección 1 y 2):
//   Bloque RIF/OI: (R_ma, O_pra Ma opuesto) ×6 · (R_ju, O_ju opuestos) ×2
//     · O_mi ×2 · R_pra ×4 = 96
//   Bloque EMI/TEA/HEA (acoplados por Lu/Ma 17:15, Lu 15:30 y Mi 15:30/17:15):
//     E_lu=S1,E_ma=S1 → HEA×3, T_lu=13:45 → 3×16 = 48
//     E_lu=S1,E_ma=S2 → HEA={Lu,Ju}    → 1×16 = 16
//     E_lu=S2,E_ma=S1 → HEA={Ma,Ju}    → 1×(16+24) = 40
//     E_lu=S2,E_ma=S2 → HEA imposible  → 0
//     (16 = combinaciones T_ju/T_pra/E_pra con T_lu=13:45; 24 con T_lu=15:30)
//     Total bloque = 104
//   Total = 96 × 104 = 9.984

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
assert(engine.slots.length === 35, `35 slots en total (got ${engine.slots.length})`)
assert(engine.totalPicks === 14, `14 clases a elegir (got ${engine.totalPicks})`)

// 2. Conteo total
const q0 = query(engine, 0n)
assert(q0.count === 9984, `9984 horarios completos válidos (got ${q0.count})`)

// 3. Con EMI S2 publicada ya no hay slots imposibles ni forzados de entrada.
for (const [id, p] of engine.pos) assert(hasBit(q0.avail, p), `disponible al inicio: ${id}`)
for (const [id, p] of engine.pos) if (hasBit(q0.forced, p)) assert(false, `forzada de entrada (no debería): ${id}`)
assert(q0.forced === 0n, 'ningún slot forzado de entrada')

// 4. Elegir RIF teórica Ma S2 (11:30) → OI práctica Ma S1 (11:30) muere,
//    la otra opción de martes de RIF muere (grupo lleno), quedan 4992.
const m1 = selectionMask(engine, ['rif-teo-ma-s2'])
const q1 = query(engine, m1)
assert(q1.count === 4992, `4992 tras RIF teórica Ma S2 (got ${q1.count})`)
assert(!hasBit(q1.avail, posOf('oi-pra-ma-s1')), 'OI práctica Ma 11:30 fuera')
assert(!hasBit(q1.avail, posOf('rif-teo-ma-s1')), 'RIF teórica Ma S1 fuera (grupo lleno)')
assert(hasBit(q1.avail, posOf('oi-pra-ma-s2')), 'OI práctica Ma 9:45 sigue disponible')

// 5. + TEA práctica Ju S1 (15:30) → fuerza TEA teórica Ju S1 (13:45), quedan 1152.
const m2 = selectionMask(engine, ['rif-teo-ma-s2', 'tea-pra-ju-s1'])
const q2 = query(engine, m2)
assert(q2.count === 1152, `1152 tras sumar TEA práctica Ju S1 (got ${q2.count})`)
assert(hasBit(q2.forced, posOf('tea-teo-ju-s1')), 'TEA teórica Ju 13:45 forzada')
assert(!hasBit(q2.avail, posOf('tea-teo-ju-s2')), 'TEA teórica Ju 15:30 fuera')

// 6. HEA Lu+Ma elegidos → tercer día fuera, y las teóricas de EMI quedan
//    forzadas a S1 (las S2 de 17:15 chocan con HEA).
const q3 = query(engine, selectionMask(engine, ['hea-teo-lu', 'hea-teo-ma']))
assert(!hasBit(q3.avail, posOf('hea-teo-ju')), 'HEA tercer día fuera con 2 elegidos')
assert(hasBit(q3.forced, posOf('emi-teo-lu-s1')), 'EMI teórica Lu forzada a S1')
assert(hasBit(q3.forced, posOf('emi-teo-ma-s1')), 'EMI teórica Ma forzada a S1')
assert(!hasBit(q3.avail, posOf('emi-teo-lu-s2')), 'EMI teórica Lu S2 fuera')

// 7. EMI teórica Lu S2 (17:15) → HEA pierde el lunes y queda forzada a Ma+Ju;
//    EMI teórica Ma S2 también muere (dejaría a HEA sin 2 días). Quedan 3840.
const q4 = query(engine, selectionMask(engine, ['emi-teo-lu-s2']))
assert(q4.count === 3840, `3840 tras EMI teórica Lu S2 (got ${q4.count})`)
assert(!hasBit(q4.avail, posOf('hea-teo-lu')), 'HEA lunes fuera')
assert(hasBit(q4.forced, posOf('hea-teo-ma')), 'HEA martes forzado')
assert(hasBit(q4.forced, posOf('hea-teo-ju')), 'HEA jueves forzado')
assert(!hasBit(q4.avail, posOf('emi-teo-ma-s2')), 'EMI teórica Ma S2 fuera (HEA quedaría sin días)')

// 8. EMI práctica Mi S2 (17:15) ↔ TEA práctica Mi S1 (17:15) se excluyen.
const q5 = query(engine, selectionMask(engine, ['emi-pra-mi-s2']))
assert(!hasBit(q5.avail, posOf('tea-pra-mi-s1')), 'TEA práctica Mi 17:15 fuera con EMI práctica Mi S2')

// 9. Selección completa → exactamente 1 horario.
const full = [
  'emi-teo-lu-s1', 'emi-teo-ma-s1', 'emi-pra-mi-s1',
  'tea-teo-lu-s1', 'tea-teo-ju-s1', 'tea-pra-mi-s1',
  'rif-teo-ma-s1', 'rif-teo-ju-s1', 'rif-pra-lu-s1',
  'oi-teo-mi-s1', 'oi-teo-ju-s1', 'oi-pra-vi-s2',
  'hea-teo-lu', 'hea-teo-ma',
]
const qf = query(engine, selectionMask(engine, full))
assert(qf.count === 1, `selección completa → 1 horario (got ${qf.count})`)

// 10. Sin OI: RIF libre (2×2×4=16) × bloque EMI/TEA/HEA (104) = 1664.
const e2 = buildEngine(COURSES, new Set([...allIds].filter((id) => id !== 'oi')))
const q6 = query(e2, 0n)
assert(q6.count === 1664, `1664 horarios sin OI (got ${q6.count})`)

// 11. Ningún horario válido tiene superposiciones (fuerza bruta).
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

// 12. Todo horario válido tiene exactamente 14 clases.
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
