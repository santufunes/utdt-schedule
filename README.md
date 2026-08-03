# Horarios UTDT · 2026 2º semestre

Armador de horarios para RIF (3110), EMI (4112), OI (4117), TEA (4136) y HEA (4155).
Web/mobile, React + Vite, pensado para deployar en Vercel. La versión del 1º semestre
2026 quedó en el historial de git (`dd317f9`).

## Cómo funciona

El motor (`src/engine.ts`) enumera **todos los horarios completos válidos** (los 2.304
que no tienen superposiciones, de 24.576 combinaciones brutas) y, ante cada selección
parcial, calcula qué opciones siguen apareciendo en al menos un horario completo
compatible. Todo lo que no puede formar parte de ningún horario válido se apaga solo —
incluye propagación global, no sólo choques directos. Las opciones que aparecen en
*todos* los horarios restantes se marcan como «única opción» y se previsualizan
punteadas en el calendario.

Reglas modeladas (ver `SPEC.md` para fuentes, tablas de horarios y discrepancias):

- RIF/EMI/OI/TEA: 2 teóricas por semana (una por día disponible, secciones mezclables)
  y 1 sola práctica de las 4 opciones.
- HEA: 2 de las 3 teóricas semanales.

## Comandos

```bash
npm run dev        # servidor de desarrollo
npm test           # chequeos del motor contra conteos derivados a mano
npm run typecheck  # tsc --noEmit
npm run build      # build de producción (dist/)
```

## Actualizar datos

Todo vive en `src/data.ts`. Cuando se publique la **Sección 2 de EMI**, agregá sus
slots a los grupos `emi-teo-lu`, `emi-teo-ma` y `emi-pra` (mismo formato que los
existentes) y ajustá los conteos esperados de `tests/engine.test.ts` si hace falta.
La selección del usuario se guarda en `localStorage` y sobrevive redeploys (los ids
de slots que dejen de existir se descartan solos).
