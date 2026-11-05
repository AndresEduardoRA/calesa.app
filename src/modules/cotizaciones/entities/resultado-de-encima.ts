import { z } from 'zod'

// Lo que vuelve de `cotizacion_encima()` (4.15-2) en lo que la pantalla necesita (4.15-3b): la nueva versión creada o el motivo por el que no. **Ningún texto de la base se muestra**:
// cada caso tiene el suyo (`textoDeEncima`). Todo lo que trae SQLSTATE es un rechazo (la transacción se deshizo entera); lo que no, una respuesta perdida (no se sabe si entró).
export type ResultadoDeEncima =
  | { tipo: 'creada'; id: string; numero: number; version: number; descartados: number }
  // Ya tiene una versión nueva viva; `id` es la suya si quien mira la ve (P11).
  | { tipo: 'ya_tiene'; id: string | null }
  // La fórmula cambió mientras cotizaba: se reintenta con un intento nuevo.
  | { tipo: 'reintentar' }
  // La anterior cambió (otro intento reusado, otro cliente o vehículo): se recarga.
  | { tipo: 'recargar' }
  | { tipo: 'sin_formula' }
  | { tipo: 'sin_total' }
  | { tipo: 'sin_acceso' }
  | { tipo: 'perdida' }
  | { tipo: 'otro' }

export type ErrorDeEncima = {
  code?: string | null
  message: string
  details?: string | null
  hint?: string | null
}

// No estricto: la respuesta trae la fila recortada entera y acá sólo importa de qué versión es y cuánto se dejó. Un intento repetido llega sin `descartados`.
const esquemaDeLaRespuesta = z.object({
  cotizacion: z.object({ id: z.guid(), numero: z.int(), version: z.int().positive() }),
  descartados: z.int().nonnegative().optional(),
})

const ES_UN_ID = z.guid()

// 22023: un dato que no es válido. Lo que cambió de la anterior se recarga; lo que no da un total o no tiene fórmula, se dice.
function rechazoDeUnDato(details: string | null, hint: string | null): ResultadoDeEncima {
  if (details === 'intento_reusado' || hint === 'lead' || hint === 'vehiculo') {
    return { tipo: 'recargar' }
  }
  if (details === 'origen_sin_formula') {
    return { tipo: 'sin_formula' }
  }
  // `total_sin_valor`, `fuera_de_rango` y el de la moneda traen el hint `total`.
  return details === 'total_sin_valor' || hint === 'total'
    ? { tipo: 'sin_total' }
    : { tipo: 'otro' }
}

function rechazoDe(error: ErrorDeEncima & { code: string }): ResultadoDeEncima {
  const details = error.details || null
  const hint = error.hint || null
  switch (error.code) {
    case 'PT409': {
      if (details === 'ya_tiene_encima') {
        const id = ES_UN_ID.safeParse(hint)
        return { tipo: 'ya_tiene', id: id.success ? id.data : null }
      }
      return details === null ? { tipo: 'reintentar' } : { tipo: 'otro' }
    }
    case '22023':
      return rechazoDeUnDato(details, hint)
    case '42501':
      return { tipo: 'sin_acceso' }
    default:
      return { tipo: 'otro' }
  }
}

export function resultadoDeEncima(respuesta: {
  data: unknown
  error: ErrorDeEncima | null
}): ResultadoDeEncima {
  const { error } = respuesta
  if (error) {
    return error.code ? rechazoDe({ ...error, code: error.code }) : { tipo: 'perdida' }
  }
  const leida = esquemaDeLaRespuesta.safeParse(respuesta.data)
  if (!leida.success) {
    return { tipo: 'perdida' }
  }
  const { cotizacion, descartados } = leida.data
  return {
    tipo: 'creada',
    id: cotizacion.id,
    numero: cotizacion.numero,
    version: cotizacion.version,
    descartados: descartados ?? 0,
  }
}

// Lo que dice el aviso de cada resultado; una creada no tiene (su aviso es efímero: la página cambia, `avisoDeCreada`).
export function textoDeEncima(resultado: ResultadoDeEncima): string | null {
  switch (resultado.tipo) {
    case 'creada':
      return null
    case 'ya_tiene':
      return resultado.id === null
        ? 'Esta cotización ya tiene una versión nueva que no puedes ver.'
        : 'Esta cotización ya tiene una versión nueva.'
    case 'reintentar':
      return 'La fórmula cambió mientras cotizabas. Vuelve a intentar.'
    case 'recargar':
      return 'Esta cotización cambió: recárgala.'
    case 'sin_formula':
      return 'Este origen ya no tiene una fórmula publicada.'
    case 'sin_total':
      return 'La versión de hoy no da un total con lo que tenía esta cotización: cotiza una nueva.'
    case 'sin_acceso':
      return 'Ya no puedes cotizar encima de esta cotización.'
    case 'perdida':
      return 'No se pudo cotizar encima. Revisa tu conexión y vuelve a intentar.'
    case 'otro':
      return 'No se pudo cotizar encima.'
  }
}

// El aviso efímero de la nueva versión: lo descartado (datos tipeados que la fórmula de hoy ya no tiene) se dice, porque la página cambia y no queda dónde.
export function avisoDeCreada(creada: Extract<ResultadoDeEncima, { tipo: 'creada' }>): string {
  const base = `Versión ${String(creada.version)} creada (n.º ${String(creada.numero)}).`
  if (creada.descartados === 0) {
    return base
  }
  return creada.descartados === 1
    ? `${base} 1 dato que tipeaste no sigue en la versión de hoy.`
    : `${base} ${String(creada.descartados)} datos que tipeaste no siguen en la versión de hoy.`
}
