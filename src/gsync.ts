// Sincronización en vivo con Google Calendar (calendario "UTDT" de la cuenta
// personal). OAuth directamente en el navegador vía Google Identity Services —
// acá no hay secretos: el client ID es un identificador público y el token de
// acceso vive sólo en memoria de la pestaña.
//
// El calendario se reconcilia como 14 eventos semanales recurrentes (RRULE +
// EXDATE, sin recordatorios, sin color propio → heredan el color del
// calendario). Cada evento creado por la app lleva la extendedProperty
// `horariosSlotId`; los eventos con título tipo "RIF · Teórica" sin etiqueta
// (p. ej. los creados a mano o por Claude) se adoptan en lugar de duplicarse.
// Cualquier otro evento del calendario no se toca.

import { COURSES, COURSE_BY_ID, fmt } from './data'
import type { Slot } from './data'
import { TZ, excludedDatesFor, firstDateFor } from './semester'

const ALL_SLOTS: Slot[] = COURSES.flatMap((c) => c.groups.flatMap((g) => g.slots))

const CLIENT_ID =
  '1060916442866-8pf0vrq5cmcrpd2p5g4t2b8g3moc2ns4.apps.googleusercontent.com'
export const CALENDAR_ID =
  '6be4531a37389edbaf6b6b69e4581089c27ebbbb7c590833978dbd1eda907618@group.calendar.google.com'
const SCOPE = 'https://www.googleapis.com/auth/calendar.events'
const API = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}`
const UNTIL_UTC = '20261128T025959Z' // 27/11/2026 23:59:59 -03 en UTC
const APP_SUMMARY = /^(RIF|EMI|OI|TEA|HEA) · (Teórica|Práctica)$/

/* ─── token OAuth ───────────────────────────────────────────────────── */

interface TokenResponse {
  access_token?: string
  expires_in?: number
  error?: string
}

let gisReady: Promise<void> | null = null
let tokenClient: {
  callback: (r: TokenResponse) => void
  error_callback?: (e: unknown) => void
  requestAccessToken: (o?: { prompt?: string }) => void
} | null = null
let accessToken: string | null = null
let tokenExpiry = 0

function loadGis(): Promise<void> {
  gisReady ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      gisReady = null
      reject(new Error('No se pudo cargar Google Identity Services'))
    }
    document.head.appendChild(s)
  })
  return gisReady
}

export function hasValidToken(): boolean {
  return accessToken !== null && Date.now() < tokenExpiry - 60_000
}

/** Pide (o renueva) el token. Devuelve false si hace falta interacción y no la hubo. */
export async function ensureToken(): Promise<boolean> {
  if (hasValidToken()) return true
  await loadGis()
  const google = (window as unknown as { google: any }).google
  return new Promise<boolean>((resolve) => {
    tokenClient ??= google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: () => {},
    })
    tokenClient!.callback = (resp) => {
      if (resp.error || !resp.access_token) {
        resolve(false)
        return
      }
      accessToken = resp.access_token
      tokenExpiry = Date.now() + (resp.expires_in ?? 3600) * 1000
      resolve(true)
    }
    tokenClient!.error_callback = () => resolve(false)
    try {
      // Con consentimiento previo el popup se cierra solo; la primera vez
      // muestra la pantalla de permiso de Google.
      tokenClient!.requestAccessToken({ prompt: '' })
    } catch {
      resolve(false)
    }
  })
}

export function disconnect() {
  const google = (window as unknown as { google?: any }).google
  if (accessToken && google?.accounts?.oauth2?.revoke) google.accounts.oauth2.revoke(accessToken)
  accessToken = null
  tokenExpiry = 0
}

/* ─── API REST ──────────────────────────────────────────────────────── */

async function api(path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (res.status === 204) return null
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(body?.error?.message ?? `HTTP ${res.status}`)
  return body
}

/* ─── estado deseado ────────────────────────────────────────────────── */

const compact = (iso: string) => iso.replaceAll('-', '')
const hhmmss = (min: number) => `${fmt(min).replace(':', '')}00`

export function eventBody(slot: Slot) {
  const course = COURSE_BY_ID.get(slot.courseId)!
  const first = firstDateFor(slot.day)
  const kind = slot.kind === 'T' ? 'Teórica' : 'Práctica'
  const exdates = excludedDatesFor(slot.day)
  const recurrence = [`RRULE:FREQ=WEEKLY;UNTIL=${UNTIL_UTC}`]
  if (exdates.length > 0)
    recurrence.push(
      `EXDATE;TZID=${TZ}:${exdates.map((d) => `${compact(d)}T${hhmmss(slot.start)}`).join(',')}`,
    )
  return {
    summary: `${course.short} · ${kind}`,
    location: `UTDT · Aula ${slot.room}`,
    description: `${course.name} (${course.code})${
      slot.section ? ` · Sección ${slot.section}` : ''
    } · ${course.people}`,
    start: { dateTime: `${first}T${fmt(slot.start)}:00`, timeZone: TZ },
    end: { dateTime: `${first}T${fmt(slot.end)}:00`, timeZone: TZ },
    recurrence,
    reminders: { useDefault: false, overrides: [] as never[] },
    extendedProperties: { private: { horariosSlotId: slot.id } },
  }
}

type EventResource = {
  id: string
  status?: string
  summary?: string
  location?: string
  description?: string
  recurrence?: string[]
  start?: { dateTime?: string }
  reminders?: { useDefault?: boolean }
  extendedProperties?: { private?: Record<string, string> }
}

const sameRecurrence = (a: string[] = [], b: string[] = []) =>
  [...a].sort().join('|') === [...b].sort().join('|')

function needsUpdate(ev: EventResource, body: ReturnType<typeof eventBody>): boolean {
  return (
    ev.summary !== body.summary ||
    ev.location !== body.location ||
    (ev.description ?? '') !== body.description ||
    !(ev.start?.dateTime ?? '').startsWith(body.start.dateTime) ||
    !sameRecurrence(ev.recurrence, body.recurrence) ||
    ev.reminders?.useDefault !== false
  )
}

/** Un evento sin etiqueta "parece nuestro" si coincide título, día y hora. */
function matchesSlot(ev: EventResource, body: ReturnType<typeof eventBody>, slot: Slot): boolean {
  if (ev.summary !== body.summary) return false
  const st = ev.start?.dateTime
  if (!st) return false
  const [datePart, timePart] = st.split('T')
  return (
    new Date(`${datePart}T00:00:00Z`).getUTCDay() === slot.day &&
    timePart.slice(0, 5) === fmt(slot.start)
  )
}

/* ─── reconciliación ────────────────────────────────────────────────── */

export interface SyncResult {
  created: number
  updated: number
  adopted: number
  deleted: number
}

async function syncSelection(slots: Slot[]): Promise<SyncResult> {
  const items: EventResource[] = []
  let pageToken: string | undefined
  do {
    const q = new URLSearchParams({ maxResults: '250' })
    if (pageToken) q.set('pageToken', pageToken)
    const page = await api(`/events?${q}`)
    items.push(...((page.items ?? []) as EventResource[]))
    pageToken = page.nextPageToken
  } while (pageToken)

  // Sólo los "maestros" recurrentes activos; las excepciones por semana que
  // el usuario haga a mano cuelgan de su maestro y no se tocan.
  const masters = items.filter((e) => e.status !== 'cancelled' && Array.isArray(e.recurrence))

  const tagged = new Map<string, EventResource>()
  const duplicates: EventResource[] = []
  const untagged: EventResource[] = []
  for (const ev of masters) {
    const sid = ev.extendedProperties?.private?.horariosSlotId
    if (sid) {
      if (tagged.has(sid)) duplicates.push(ev)
      else tagged.set(sid, ev)
    } else if (APP_SUMMARY.test(ev.summary ?? '')) {
      untagged.push(ev)
    }
    // el resto del calendario no se toca
  }

  const result: SyncResult = { created: 0, updated: 0, adopted: 0, deleted: 0 }
  const desiredIds = new Set(slots.map((s) => s.id))
  const consumed = new Set<string>()

  for (const slot of slots) {
    const body = eventBody(slot)
    const existing = tagged.get(slot.id)
    if (existing) {
      if (needsUpdate(existing, body)) {
        await api(`/events/${existing.id}`, { method: 'PATCH', body: JSON.stringify(body) })
        result.updated++
      }
      continue
    }
    const candidate = untagged.find((ev) => !consumed.has(ev.id) && matchesSlot(ev, body, slot))
    if (candidate) {
      consumed.add(candidate.id)
      await api(`/events/${candidate.id}`, { method: 'PATCH', body: JSON.stringify(body) })
      result.adopted++
      continue
    }
    await api('/events', { method: 'POST', body: JSON.stringify(body) })
    result.created++
  }

  const toDelete = [
    ...[...tagged.entries()].filter(([sid]) => !desiredIds.has(sid)).map(([, ev]) => ev),
    ...duplicates,
    ...untagged.filter((ev) => !consumed.has(ev.id)),
  ]
  for (const ev of toDelete) {
    await api(`/events/${ev.id}`, { method: 'DELETE' })
    result.deleted++
  }

  return result
}

// Serializa las corridas para que dos ediciones rápidas no se pisen.
let chain: Promise<unknown> = Promise.resolve()
export function queueSync(slots: Slot[]): Promise<SyncResult> {
  const run = chain.then(() => syncSelection(slots))
  chain = run.catch(() => {})
  return run
}

/* ─── el calendario como fuente de verdad entre dispositivos ────────── */

/** Lee la selección guardada en el calendario (ids de slots de los eventos). */
export async function fetchCloudSelection(): Promise<string[]> {
  const items: EventResource[] = []
  let pageToken: string | undefined
  do {
    const q = new URLSearchParams({ maxResults: '250' })
    if (pageToken) q.set('pageToken', pageToken)
    const page = await api(`/events?${q}`)
    items.push(...((page.items ?? []) as EventResource[]))
    pageToken = page.nextPageToken
  } while (pageToken)

  const validIds = new Set(ALL_SLOTS.map((s) => s.id))
  const found = new Set<string>()
  for (const ev of items) {
    if (ev.status === 'cancelled' || !Array.isArray(ev.recurrence)) continue
    const sid = ev.extendedProperties?.private?.horariosSlotId
    if (sid && validIds.has(sid)) {
      found.add(sid)
      continue
    }
    // Sin etiqueta (evento creado a mano o por Claude): matchear por
    // título + día + hora contra los slots conocidos.
    if (APP_SUMMARY.test(ev.summary ?? '')) {
      const slot = ALL_SLOTS.find((s) => matchesSlot(ev, eventBody(s), s))
      if (slot) found.add(slot.id)
    }
  }
  return [...found].sort()
}

export type SyncDirection = 'in-sync' | 'adopt-cloud' | 'push-local'

/**
 * Decide qué lado gana al reconciliar la selección local con la del
 * calendario. `lastSynced` es la última selección que este dispositivo
 * sincronizó con éxito (null si nunca sincronizó).
 *
 * - Sin historia local: gana la nube si tiene algo (dispositivo nuevo);
 *   si la nube está vacía, se suben las ediciones locales.
 * - Local sin cambios desde el último sync → se adopta lo de la nube
 *   (otro dispositivo editó).
 * - Nube sin cambios desde el último sync → se suben los cambios locales.
 * - Divergencia real (ambos cambiaron) → ganan las ediciones locales,
 *   que son lo que el usuario tiene delante.
 */
export function decideSyncDirection(
  local: string[],
  lastSynced: string[] | null,
  cloud: string[],
): SyncDirection {
  const key = (ids: string[]) => [...ids].sort().join(',')
  const l = key(local)
  const c = key(cloud)
  if (l === c) return 'in-sync'
  if (lastSynced === null) return cloud.length > 0 ? 'adopt-cloud' : 'push-local'
  const s = key(lastSynced)
  if (l === s) return 'adopt-cloud'
  if (c === s) return 'push-local'
  return 'push-local'
}
