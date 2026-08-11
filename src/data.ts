// Datos 2026 · 2º semestre (03/08/2026 – 27/11/2026).
// Fuentes y discrepancias documentadas en SPEC.md.
// Precedencia: mail de Pilar Devoto (OI) > campus virtual (RIF, TEA) > sistema de inscripción (EMI, HEA).

export type Day = 1 | 2 | 3 | 4 | 5

export const DAY_ABBR: Record<Day, string> = { 1: 'Lu', 2: 'Ma', 3: 'Mi', 4: 'Ju', 5: 'Vi' }
export const DAY_FULL: Record<Day, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
}

export interface Slot {
  id: string
  courseId: string
  day: Day
  start: number // minutos desde las 00:00
  end: number
  room: string
  section: 1 | 2 | null
  kind: 'T' | 'P'
  note?: string
}

export interface Group {
  id: string
  label: string
  pick: number // cuántos horarios de este grupo hay que elegir
  slots: Slot[]
}

export interface Course {
  id: string
  code: string
  short: string
  name: string
  people: string
  color: string
  note?: string
  groups: Group[]
}

const t = (h: number, m = 0) => h * 60 + m

export const fmt = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

type SlotDef = Omit<Slot, 'courseId'>
type GroupDef = Omit<Group, 'slots'> & { slots: SlotDef[] }
type CourseDef = Omit<Course, 'groups'> & { groups: GroupDef[] }

const course = (def: CourseDef): Course => ({
  ...def,
  groups: def.groups.map((g) => ({
    ...g,
    slots: g.slots.map((s) => ({ ...s, courseId: def.id })),
  })),
})

export const COURSES: Course[] = [
  course({
    id: 'rif',
    code: '3110',
    short: 'RIF',
    name: 'Riesgo, Incertidumbre y Finanzas',
    people: 'Sola (teóricas) · Delgado (prácticas)',
    color: '#3b82f6',
    groups: [
      {
        id: 'rif-teo-ma',
        label: 'Teórica · Martes',
        pick: 1,
        slots: [
          { id: 'rif-teo-ma-s1', day: 2, start: t(9, 45), end: t(11, 20), room: 'SV201', section: 1, kind: 'T' },
          { id: 'rif-teo-ma-s2', day: 2, start: t(11, 30), end: t(13, 5), room: 'SV201', section: 2, kind: 'T' },
        ],
      },
      {
        id: 'rif-teo-ju',
        label: 'Teórica · Jueves',
        pick: 1,
        slots: [
          { id: 'rif-teo-ju-s1', day: 4, start: t(9, 45), end: t(11, 20), room: 'SV201', section: 1, kind: 'T' },
          { id: 'rif-teo-ju-s2', day: 4, start: t(11, 30), end: t(13, 5), room: 'SV201', section: 2, kind: 'T' },
        ],
      },
      {
        id: 'rif-pra',
        label: 'Práctica',
        pick: 1,
        slots: [
          { id: 'rif-pra-lu-s2', day: 1, start: t(9, 45), end: t(11, 20), room: 'A112', section: 2, kind: 'P' },
          { id: 'rif-pra-lu-s1', day: 1, start: t(11, 30), end: t(13, 5), room: 'SV202', section: 1, kind: 'P' },
          { id: 'rif-pra-vi-s2', day: 5, start: t(8, 0), end: t(9, 35), room: 'SVE4', section: 2, kind: 'P' },
          {
            id: 'rif-pra-vi-s1',
            day: 5,
            start: t(9, 45),
            end: t(11, 20),
            room: 'A203',
            section: 1,
            kind: 'P',
            note: 'El campus dice 9:35–11:20; la inscripción, 9:45–11:20. No afecta ningún cruce.',
          },
        ],
      },
    ],
  }),
  course({
    id: 'emi',
    code: '4112',
    short: 'EMI',
    name: 'Economía Monetaria Internacional',
    people: 'Espino (teóricas) · Dallazuana (prácticas)',
    color: '#f59e0b',
    groups: [
      {
        id: 'emi-teo-lu',
        label: 'Teórica · Lunes',
        pick: 1,
        slots: [
          { id: 'emi-teo-lu-s1', day: 1, start: t(15, 30), end: t(17, 5), room: 'SV202', section: 1, kind: 'T' },
          { id: 'emi-teo-lu-s2', day: 1, start: t(17, 15), end: t(18, 50), room: 'SV202', section: 2, kind: 'T' },
        ],
      },
      {
        id: 'emi-teo-ma',
        label: 'Teórica · Martes',
        pick: 1,
        slots: [
          { id: 'emi-teo-ma-s1', day: 2, start: t(15, 30), end: t(17, 5), room: 'SV201', section: 1, kind: 'T' },
          { id: 'emi-teo-ma-s2', day: 2, start: t(17, 15), end: t(18, 50), room: 'SV201', section: 2, kind: 'T' },
        ],
      },
      {
        id: 'emi-pra',
        label: 'Práctica',
        pick: 1,
        slots: [
          { id: 'emi-pra-mi-s1', day: 3, start: t(15, 30), end: t(17, 5), room: 'SV105', section: 1, kind: 'P' },
          { id: 'emi-pra-mi-s2', day: 3, start: t(17, 15), end: t(18, 50), room: 'SV201', section: 2, kind: 'P' },
          { id: 'emi-pra-vi-s2', day: 5, start: t(15, 30), end: t(17, 5), room: 'A102', section: 2, kind: 'P' },
          { id: 'emi-pra-vi-s1', day: 5, start: t(17, 15), end: t(18, 50), room: 'A113', section: 1, kind: 'P' },
        ],
      },
    ],
  }),
  course({
    id: 'oi',
    code: '4117',
    short: 'OI',
    name: 'Organización Industrial',
    people: 'Tappatá (teóricas) · Devoto (prácticas)',
    color: '#14b8a6',
    note: 'Horarios según el mail de Pilar Devoto (con las aulas de los martes ya corregidas).',
    groups: [
      {
        id: 'oi-teo-mi',
        label: 'Teórica · Miércoles',
        pick: 1,
        slots: [
          { id: 'oi-teo-mi-s2', day: 3, start: t(9, 45), end: t(11, 20), room: 'SV202', section: 2, kind: 'T' },
          { id: 'oi-teo-mi-s1', day: 3, start: t(11, 30), end: t(13, 5), room: 'SV202', section: 1, kind: 'T' },
        ],
      },
      {
        id: 'oi-teo-ju',
        label: 'Teórica · Jueves',
        pick: 1,
        slots: [
          { id: 'oi-teo-ju-s2', day: 4, start: t(9, 45), end: t(11, 20), room: 'SV202', section: 2, kind: 'T' },
          { id: 'oi-teo-ju-s1', day: 4, start: t(11, 30), end: t(13, 5), room: 'SV202', section: 1, kind: 'T' },
        ],
      },
      {
        id: 'oi-pra',
        label: 'Práctica',
        pick: 1,
        slots: [
          { id: 'oi-pra-ma-s2', day: 2, start: t(9, 45), end: t(11, 20), room: 'A107', section: 2, kind: 'P' },
          { id: 'oi-pra-ma-s1', day: 2, start: t(11, 30), end: t(13, 5), room: 'M2', section: 1, kind: 'P' },
          { id: 'oi-pra-ju-s1', day: 4, start: t(8, 0), end: t(9, 35), room: 'SVE3', section: 1, kind: 'P' },
          { id: 'oi-pra-vi-s2', day: 5, start: t(11, 30), end: t(13, 5), room: 'A203', section: 2, kind: 'P' },
        ],
      },
    ],
  }),
  course({
    id: 'tea',
    code: '4136',
    short: 'TEA',
    name: 'Tópicos de Economía Aplicada',
    people: 'Ruffo (teóricas) · Fernandez (prácticas)',
    color: '#a78bfa',
    groups: [
      {
        id: 'tea-teo-lu',
        label: 'Teórica · Lunes',
        pick: 1,
        slots: [
          { id: 'tea-teo-lu-s1', day: 1, start: t(13, 45), end: t(15, 20), room: 'SV201', section: 1, kind: 'T' },
          { id: 'tea-teo-lu-s2', day: 1, start: t(15, 30), end: t(17, 5), room: 'SV201', section: 2, kind: 'T' },
        ],
      },
      {
        id: 'tea-teo-ju',
        label: 'Teórica · Jueves',
        pick: 1,
        slots: [
          { id: 'tea-teo-ju-s1', day: 4, start: t(13, 45), end: t(15, 20), room: 'SV201', section: 1, kind: 'T' },
          { id: 'tea-teo-ju-s2', day: 4, start: t(15, 30), end: t(17, 5), room: 'SV201', section: 2, kind: 'T' },
        ],
      },
      {
        id: 'tea-pra',
        label: 'Práctica',
        pick: 1,
        slots: [
          { id: 'tea-pra-lu-s2', day: 1, start: t(13, 45), end: t(15, 20), room: 'A103', section: 2, kind: 'P' },
          { id: 'tea-pra-mi-s2', day: 3, start: t(15, 30), end: t(17, 5), room: 'A101', section: 2, kind: 'P' },
          {
            id: 'tea-pra-mi-s1',
            day: 3,
            start: t(17, 15),
            end: t(18, 50),
            room: 'P102',
            section: 1,
            kind: 'P',
            note: 'Aula P102 según el campus; la inscripción decía P201.',
          },
          { id: 'tea-pra-ju-s1', day: 4, start: t(15, 30), end: t(17, 5), room: 'A203', section: 1, kind: 'P' },
        ],
      },
    ],
  }),
  course({
    id: 'hea',
    code: '4155',
    short: 'HEA',
    name: 'Historia Económica Argentina',
    people: 'della Paolera (teóricas)',
    color: '#f43f5e',
    note: 'Se cursan 2 de las 3 clases semanales; qué días concurrir se anuncia cada semana por campus. Elegí acá los 2 días que preferís tener fijos.',
    groups: [
      {
        id: 'hea-teo',
        label: 'Teórica',
        pick: 2,
        slots: [
          { id: 'hea-teo-lu', day: 1, start: t(17, 15), end: t(18, 50), room: 'SV201', section: null, kind: 'T' },
          { id: 'hea-teo-ma', day: 2, start: t(17, 15), end: t(18, 50), room: 'SV202', section: null, kind: 'T' },
          { id: 'hea-teo-ju', day: 4, start: t(17, 15), end: t(18, 50), room: 'SV202', section: null, kind: 'T' },
        ],
      },
    ],
  }),
]

export const COURSE_BY_ID = new Map(COURSES.map((c) => [c.id, c]))

export const SLOT_COURSE = new Map(
  COURSES.flatMap((c) => c.groups.flatMap((g) => g.slots.map((s) => [s.id, c.id] as const))),
)

export const FOOTNOTES: string[] = [
  'Cursada del 03/08/2026 al 27/11/2026. En RIF, EMI, OI y TEA se cursan las dos teóricas semanales (una por día disponible, pudiendo mezclar secciones) y una sola clase práctica, cualquiera de las cuatro.',
  'EMI: horarios de Sección 1 y Sección 2 según la página del curso en el campus (03/08/2026).',
  'RIF · práctica S1 de viernes: el campus dice 9:35–11:20 y la inscripción 9:45–11:20; se usa 9:45. No cambia ningún cruce posible.',
  'TEA · práctica S1 de miércoles: aula P102 según el campus (la inscripción decía P201).',
  'OI: horarios tomados del mail de Pilar Devoto, que corrige las aulas de los martes (A107 para S2 y M2 para S1).',
  'HEA: la cátedra anuncia cada semana a cuáles 2 de las 3 clases concurrir; el armador asume que fijás 2 días. Si podés, dejate libres los 3 bloques.',
  'El .ics exporta el semestre completo (03/08–27/11) sin feriados (17/8, 12/10, 23/11), sin días no laborables (11/9, 21/9) y sin las semanas de parciales (28/9–9/10). Los finales caen después del fin de clases. Eventos sin notificaciones.',
  '«Conectar Google» sincroniza en vivo tu selección con el calendario «UTDT» de tu cuenta (mismas fechas y exclusiones que el .ics, sin notificaciones, color uniforme del calendario). Sólo se tocan los eventos de clases; lo demás que agregues a ese calendario queda intacto. Las ediciones de una semana puntual hechas a mano en Google Calendar se conservan mientras no cambies esa clase acá.',
  'El calendario «UTDT» es además la fuente de verdad entre dispositivos: al abrir la página (o volver a la pestaña) estando conectado, la selección se trae de ahí; tus ediciones pendientes siempre pisan a las viejas. Conectá Google una vez en cada dispositivo y vas a ver el mismo horario en todos.',
]
