// Chequeos de la regla de reconciliación entre dispositivos.
// Correr con: npm test

import { decideSyncDirection } from '../src/gsync'

let failures = 0
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failures++
    console.error('FAIL –', msg)
  } else {
    console.log('ok   –', msg)
  }
}

const A = ['rif-teo-ma-s2', 'hea-teo-ju']
const B = ['rif-teo-ma-s1', 'hea-teo-ju']
const C = ['oi-pra-vi-s2']

// Igualdad (el orden no importa)
assert(decideSyncDirection(A, null, [...A].reverse()) === 'in-sync', 'local == nube → in-sync')

// Dispositivo nuevo (sin historia local)
assert(decideSyncDirection([], null, A) === 'adopt-cloud', 'nuevo + nube con datos → adopta la nube')
assert(decideSyncDirection(A, null, []) === 'push-local', 'nuevo + nube vacía → sube lo local')
assert(decideSyncDirection([], null, []) === 'in-sync', 'nuevo + todo vacío → in-sync')
assert(decideSyncDirection(A, null, B) === 'adopt-cloud', 'sin historia + ambos con datos → adopta la nube')

// Con historia
assert(decideSyncDirection(A, A, B) === 'adopt-cloud', 'local sin cambios, nube cambió → adopta')
assert(decideSyncDirection(B, A, A) === 'push-local', 'nube sin cambios, local cambió → sube')
assert(decideSyncDirection(B, A, C) === 'push-local', 'divergencia real → ganan las ediciones locales')
assert(decideSyncDirection(A, A, A) === 'in-sync', 'todo igual → in-sync')

// Vaciar la selección en este dispositivo también se propaga
assert(decideSyncDirection([], A, A) === 'push-local', 'local vació su selección → sube (borra en nube)')

if (failures) {
  console.error(`\n${failures} chequeo(s) fallaron`)
  process.exit(1)
} else {
  console.log('\nTodos los chequeos pasaron ✓')
}
