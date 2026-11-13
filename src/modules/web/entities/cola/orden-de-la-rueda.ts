// El orden de la rueda que dibuja el tablero (8.04-2): **espejo documentado** del paso 5 de `web.solicitar_asesor`.
// La base decide a quién va cada turno; esto sólo dibuja en qué orden la ruleta elegiría hoy
// entre las que están en la rueda. Antes de la ruleta la base mira el turno abierto del visitante y el pegajoso: pueden adelantarse, así que el número es el
// orden de la ruleta, nunca una promesa de «le toca». Si la función de la base cambia de orden, este archivo y su test cambian con ella.
import type { FilaDelTablero } from './tablero'

export type MotivoFuera = 'falta_whatsapp' | 'no_disponible'

// Completan «Hoy no recibe turnos nuevos: …».
export const MOTIVO_FUERA: Record<MotivoFuera, string> = {
  falta_whatsapp: 'le falta el WhatsApp',
  no_disponible: 'no está disponible',
}

export type OrdenDeLaRueda = {
  // Las que la ruleta elegiría hoy, en su orden.
  elegibles: FilaDelTablero[]
  // En la rueda, pero hoy no reciben un turno nuevo; por nombre.
  fuera: { fila: FilaDelTablero; motivo: MotivoFuera }[]
}

function instante(iso: string | null): number | null {
  return iso === null ? null : Date.parse(iso)
}

// `order by (abiertas >= cupo), abiertas / greatest(prioridad + 1, 1), ultima_asignacion_en asc nulls first, orden, usuario_id`.
function compararComoLaBase(a: FilaDelTablero, b: FilaDelTablero): number {
  const llenaA = a.abiertas >= a.cupo ? 1 : 0
  const llenaB = b.abiertas >= b.cupo ? 1 : 0
  if (llenaA !== llenaB) {
    return llenaA - llenaB
  }
  // División entera, como `int / int` en Postgres (las dos son no negativas).
  const cargaA = Math.floor(a.abiertas / Math.max(a.prioridad + 1, 1))
  const cargaB = Math.floor(b.abiertas / Math.max(b.prioridad + 1, 1))
  if (cargaA !== cargaB) {
    return cargaA - cargaB
  }
  const ultimaA = instante(a.ultimaAsignacionEn)
  const ultimaB = instante(b.ultimaAsignacionEn)
  if (ultimaA !== ultimaB) {
    if (ultimaA === null) {
      return -1
    }
    if (ultimaB === null) {
      return 1
    }
    return ultimaA - ultimaB
  }
  if (a.orden !== b.orden) {
    return a.orden - b.orden
  }
  // `uuid` se ordena por bytes: igual que el texto en minúsculas.
  const idA = a.usuarioId.toLowerCase()
  const idB = b.usuarioId.toLowerCase()
  return idA < idB ? -1 : idA > idB ? 1 : 0
}

// Sólo las que están en la rueda. Elegible = disponible y con WhatsApp (la base exige además `cola_activa`, que la pantalla avisa aparte). No muta la entrada.
export function ordenDeLaRueda(filas: readonly FilaDelTablero[]): OrdenDeLaRueda {
  const enLaRueda = filas.filter((f) => f.enLaRueda)
  const elegibles = enLaRueda
    .filter((f) => f.disponible && !f.faltaWhatsapp)
    .sort(compararComoLaBase)
  const fuera = enLaRueda
    .filter((f) => !f.disponible || f.faltaWhatsapp)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    .map((fila) => ({
      fila,
      motivo: (fila.faltaWhatsapp ? 'falta_whatsapp' : 'no_disponible') as MotivoFuera,
    }))
  return { elegibles, fuera }
}
