# Horarios UTDT · 2026 2º semestre — fuentes y reglas

Cursada: **03/08/2026 – 27/11/2026**. Materias: RIF (3110), EMI (4112), OI (4117), TEA (4136), HEA (4155).

## Reglas de cursada

- **RIF, EMI, OI, TEA**: se cursan **las 2 teóricas semanales** (una por cada día disponible, eligiendo el bloque horario de cualquiera de las dos secciones — se pueden mezclar secciones entre días) y **1 sola práctica** por semana, cualquiera de las 4 opciones publicadas ("sólo se debe asistir a uno de los dos prácticos").
- **HEA**: 3 clases teóricas publicadas por semana; se concurre a **2 de las 3**. La cátedra anuncia por campus qué días concurrir cada semana — el armador modela la elección de 2 días fijos.
- Restricción global: ninguna clase elegida puede superponerse en día y hora con otra.

## Precedencia de fuentes

1. **Mail de Pilar Devoto** (OI) — corrige las aulas de los martes de un mail anterior. Autoridad para OI.
2. **Campus virtual** (páginas de curso 3110 y 4136) — aporta las secciones 2 de RIF y TEA.
3. **Sistema de inscripción** — única fuente para EMI y HEA; sólo muestra la sección inscripta.

## Horarios

### RIF 3110 — Riesgo, Incertidumbre y Finanzas (Sola / Delgado)

| Tipo | Día | Hora | Aula | Sección |
|---|---|---|---|---|
| Teórica | Ma | 09:45–11:20 | SV201 | S1 |
| Teórica | Ma | 11:30–13:05 | SV201 | S2 |
| Teórica | Ju | 09:45–11:20 | SV201 | S1 |
| Teórica | Ju | 11:30–13:05 | SV201 | S2 |
| Práctica | Lu | 09:45–11:20 | A112 | S2 |
| Práctica | Lu | 11:30–13:05 | SV202 | S1 |
| Práctica | Vi | 08:00–09:35 | SVE4 | S2 |
| Práctica | Vi | 09:45–11:20 | A203 | S1 * |

\* Discrepancia: campus dice 9:35–11:20, inscripción 9:45–11:20. Se usa 9:45 (grilla estándar). No cambia ningún cruce: los únicos bloques de viernes de otras materias son 11:30 (OI) y 17:15 (EMI).

### EMI 4112 — Economía Monetaria Internacional (Espino / Dallazuana)

| Tipo | Día | Hora | Aula | Sección |
|---|---|---|---|---|
| Teórica | Lu | 15:30–17:05 | SV202 | S1 |
| Teórica | Ma | 15:30–17:05 | SV201 | S1 |
| Práctica | Mi | 15:30–17:05 | SV105 | S1 |
| Práctica | Vi | 17:15–18:50 | A113 | S1 |

**Pendiente**: la Sección 2 de EMI (teóricas y práctica) no figura en el material disponible. Cuando se publique, agregarla en `src/data.ts` (grupos `emi-teo-lu`, `emi-teo-ma`, `emi-pra`).

### OI 4117 — Organización Industrial (Tappatá / Devoto) — según mail de Devoto

| Tipo | Día | Hora | Aula | Sección |
|---|---|---|---|---|
| Teórica | Mi | 09:45–11:20 | SV202 | S2 |
| Teórica | Mi | 11:30–13:05 | SV202 | S1 |
| Teórica | Ju | 09:45–11:20 | SV202 | S2 |
| Teórica | Ju | 11:30–13:05 | SV202 | S1 |
| Práctica | Ma | 09:45–11:20 | A107 | S2 |
| Práctica | Ma | 11:30–13:05 | M2 | S1 |
| Práctica | Ju | 08:00–09:35 | SVE3 | S1 |
| Práctica | Vi | 11:30–13:05 | A203 | S2 |

Nota: la tarjeta de inscripción etiqueta como "Práctica 1" a los horarios que el mail asigna a la Sección 2 (Ma 9:45 + Vi 11:30); se usa la numeración del mail.

### TEA 4136 — Tópicos de Economía Aplicada (Ruffo / Fernandez)

| Tipo | Día | Hora | Aula | Sección |
|---|---|---|---|---|
| Teórica | Lu | 13:45–15:20 | SV201 | S1 |
| Teórica | Lu | 15:30–17:05 | SV201 | S2 |
| Teórica | Ju | 13:45–15:20 | SV201 | S1 |
| Teórica | Ju | 15:30–17:05 | SV201 | S2 |
| Práctica | Lu | 13:45–15:20 | A103 | S2 |
| Práctica | Mi | 15:30–17:05 | SV102 | S2 |
| Práctica | Mi | 17:15–18:50 | P102 | S1 * |
| Práctica | Ju | 15:30–17:05 | A203 | S1 |

\* Aula P102 según campus; la inscripción decía P201. Se usa P102.

### HEA 4155 — Historia Económica Argentina (della Paolera)

| Tipo | Día | Hora | Aula |
|---|---|---|---|
| Teórica | Lu | 17:15–18:50 | SV201 |
| Teórica | Ma | 17:15–18:50 | SV202 |
| Teórica | Ju | 17:15–18:50 | SV202 |

Se eligen 2 de 3.

## Hechos derivados (verificados por `npm test`)

- 31 slots en total; un horario completo tiene **14 clases** (3+3+3+3+2).
- Espacio bruto: 16 (RIF) × 2 (EMI) × 16 (OI) × 16 (TEA) × 3 (HEA) = 24.576 combinaciones; **2.304 son válidas** (sin superposiciones).
- Desde el arranque quedan **fijas**: EMI teórica Lu 15:30, EMI teórica Ma 15:30 (opción única) y TEA teórica Lu 13:45 S1 (la S2 de 15:30 choca con la única teórica de EMI del lunes).
- Desde el arranque quedan **imposibles**: TEA teórica Lu S2 (15:30) y TEA práctica Lu S2 (13:45, choca con la teórica fija de TEA).
- El jueves a la mañana RIF y OI compiten por los bloques 9:45 y 11:30: siempre van en bloques opuestos.
