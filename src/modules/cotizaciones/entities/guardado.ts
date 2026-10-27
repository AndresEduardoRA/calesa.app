import { z } from 'zod'
import type { Envio } from '@/shared/lib/enviar-accion'
import { MENSAJE_SESION_VENCIDA } from '@/shared/lib/errores'
import { DESCARTES_DE_RECALCULO } from './recalculo-esquema'

// Guardar la hoja (`cotizacion_crear()`, paso 4.13-3b): lo que vuelve, en la forma que usa la pantalla. **El mensaje de la base nunca se muestra** (puede nombrar un nodo que
// quien mira no ve): cada rechazo se lee de su código, su `details` y su `hint`, y la pantalla dice su propio texto.

// Lo que la pantalla muestra de lo guardado: el número y el total. El resto del snapshot no viaja al DOM.
export type CotizacionGuardada = {
  id: string
  numero: number
  totalUsd: number | null
  // La base ya tenía ese intento: lo que vuelve es lo que se guardó la primera vez (4-21).
  repetido: boolean
}

export type MotivoDeRechazo =
  | 'desactualizada_formula'
  | 'desactualizada_tipo_cambio'
  | 'conflicto'
  | 'recargar_hoja'
  | 'sin_formula'
  | 'sin_total'
  | 'total_fuera_de_rango'
  | 'moneda_no_soportada'
  | 'valor_descartado'
  | 'variante_oculta'
  | 'falta_lead'
  | 'falta_vehiculo'
  | 'sin_acceso'
  | 'sesion'
  | 'transitorio'
  | 'otro'

// `perdida`: no se sabe si se guardó (un error sin SQLSTATE, o una respuesta que no se puede leer). Todo lo que trae SQLSTATE es un rechazo: la transacción se deshizo entera.
export type ResultadoDeCrear =
  | { tipo: 'guardada'; cotizacion: CotizacionGuardada }
  | { tipo: 'perdida' }
  | { tipo: 'rechazo'; motivo: MotivoDeRechazo }

export type ErrorDeCrear = {
  code?: string | null
  message: string
  details?: string | null
  hint?: string | null
}

// No estricto: lo que el tipo no nombra se cae (la respuesta trae el snapshot recortado entero).
const esquemaDeGuardada = z.object({
  cotizacion: z.object({ id: z.guid(), numero: z.number().int() }),
  totales: z.object({ usd: z.number().nullable().optional() }).optional(),
  repetido: z.boolean(),
})

const TRANSITORIOS = new Set([
  'XX000',
  '57014',
  '40P01',
  '55P03',
  'PGRST000',
  'PGRST001',
  'PGRST002',
  'PGRST003',
])
const DESCARTES: ReadonlySet<string> = new Set(
  DESCARTES_DE_RECALCULO.filter((d) => d !== 'nodo_inexistente'),
)

// Los 22023 por su `details` (el código de `_motor_fallar` o de la RPC); lo que no está aquí se lee por su `hint`.
const POR_DETALLE: Readonly<Record<string, MotivoDeRechazo>> = {
  nodo_inexistente: 'recargar_hoja',
  entrada_invalida: 'recargar_hoja',
  origen_sin_formula: 'sin_formula',
  variante_sin_eleccion: 'variante_oculta',
  ...Object.fromEntries([...DESCARTES].map((d) => [d, 'valor_descartado' as const])),
}
const DEL_TOTAL: Readonly<Record<string, MotivoDeRechazo>> = {
  total_sin_valor: 'sin_total',
  fuera_de_rango: 'total_fuera_de_rango',
}
const SIN_DETALLE: Readonly<Record<string, MotivoDeRechazo>> = {
  lead: 'falta_lead',
  vehiculo: 'falta_vehiculo',
  total: 'moneda_no_soportada',
}

function motivoDe22023(details: string | null, hint: string | null): MotivoDeRechazo {
  if (hint === 'abierta') {
    return 'recargar_hoja'
  }
  if (details === null) {
    return (
      (hint !== null && Object.hasOwn(SIN_DETALLE, hint) ? SIN_DETALLE[hint] : undefined) ?? 'otro'
    )
  }
  const tabla = hint === 'total' ? DEL_TOTAL : POR_DETALLE
  return (Object.hasOwn(tabla, details) ? tabla[details] : undefined) ?? 'otro'
}

function motivoDe(error: ErrorDeCrear & { code: string }): MotivoDeRechazo {
  const details = error.details || null
  const hint = error.hint || null
  switch (error.code) {
    case 'PT409':
      if (details === 'desactualizada') {
        return hint === 'tipo_cambio' ? 'desactualizada_tipo_cambio' : 'desactualizada_formula'
      }
      return 'conflicto'
    case '22023':
      return motivoDe22023(details, hint)
    case '42501':
      return details === 'nodo_no_editable' ? 'recargar_hoja' : 'sin_acceso'
    case 'PGRST301':
      return 'sesion'
    default:
      return TRANSITORIOS.has(error.code) ? 'transitorio' : 'otro'
  }
}

export function resultadoDeCrear(respuesta: {
  data: unknown
  error: ErrorDeCrear | null
}): ResultadoDeCrear {
  const { error } = respuesta
  if (error) {
    return error.code
      ? { tipo: 'rechazo', motivo: motivoDe({ ...error, code: error.code }) }
      : { tipo: 'perdida' }
  }
  const leida = esquemaDeGuardada.safeParse(respuesta.data)
  if (!leida.success) {
    return { tipo: 'perdida' }
  }
  const { cotizacion, totales, repetido } = leida.data
  return {
    tipo: 'guardada',
    cotizacion: {
      id: cotizacion.id,
      numero: cotizacion.numero,
      totalUsd: totales?.usd ?? null,
      repetido,
    },
  }
}

// La salida que acompaña al texto: `d2` son las dos de la hoja desactualizada; `recargar` reabre la hoja (lo tipeado vuelve con el borrador); `reintentar`, otro guardado;
// `ingresar`, la sesión. Nula: un botón que no arregla nada no se ofrece.
export type SalidaDelAviso = 'd2' | 'recargar' | 'reintentar' | 'ingresar' | null
export type TextoDelAviso = { texto: string; salida: SalidaDelAviso }

const RECARGAR_HOJA = 'Esta hoja ya no se puede guardar: recárgala. Lo que escribiste vuelve.'
const NO_SE_PUDO = 'No se pudo guardar. Vuelve a intentar en un momento.'
export const VALOR_DESCARTADO =
  'Hay un valor que esta hoja no acepta: restablece la celda con aviso.'
export const FALTA_EL_LEAD = 'Para guardar, abre la hoja desde un lead.'
export const FALTA_EL_VEHICULO = 'Este origen pide un vehículo para guardar.'

// Exhaustivo: un motivo nuevo sin su texto no compila.
const TEXTOS: Readonly<Record<MotivoDeRechazo, TextoDelAviso>> = {
  desactualizada_formula: {
    texto: 'Se publicó una versión nueva de la fórmula mientras cotizabas.',
    salida: 'd2',
  },
  desactualizada_tipo_cambio: {
    texto: 'Cambió un tipo de cambio de la hoja mientras cotizabas.',
    salida: 'd2',
  },
  conflicto: {
    texto: 'La hoja cambió mientras guardabas. Vuelve a intentar.',
    salida: 'reintentar',
  },
  recargar_hoja: { texto: RECARGAR_HOJA, salida: 'recargar' },
  sin_formula: { texto: 'Este origen ya no tiene una fórmula publicada.', salida: 'recargar' },
  sin_total: {
    texto: 'No se puede guardar sin total: completa las celdas con aviso.',
    salida: null,
  },
  total_fuera_de_rango: { texto: 'El total no cabe: revisa los montos de la hoja.', salida: null },
  moneda_no_soportada: {
    texto:
      'El cotizador no calcula en la moneda de la empresa. Avisa a quien administra el sistema.',
    salida: null,
  },
  valor_descartado: { texto: VALOR_DESCARTADO, salida: null },
  variante_oculta: {
    texto: 'La hoja necesita una opción que no puedes ver. Avisa a quien configura el cotizador.',
    salida: null,
  },
  falta_lead: { texto: FALTA_EL_LEAD, salida: null },
  falta_vehiculo: { texto: FALTA_EL_VEHICULO, salida: null },
  // Los seis orígenes del 42501 sin detalle (sin permiso, la cuenta bloqueada, el lead, el vehículo, el id ajeno, la propia action) dicen lo mismo: no confirman qué existe.
  sin_acceso: {
    texto:
      'No pudimos guardar: ya no tienes acceso a lo que estás cotizando. Recarga la hoja; si sigue igual, pídeselo a quien administra los roles.',
    salida: 'recargar',
  },
  sesion: { texto: MENSAJE_SESION_VENCIDA, salida: 'ingresar' },
  transitorio: { texto: NO_SE_PUDO, salida: 'reintentar' },
  otro: {
    texto: 'No se pudo guardar esta hoja. Avisa a quien administra el sistema.',
    salida: null,
  },
}

export const textoDelRechazo = (motivo: MotivoDeRechazo): TextoDelAviso => TEXTOS[motivo]

// Lo que no es una respuesta de la action: no llegó (`sinRed`), la entrada no pasó el esquema (`validacion`) o el `serverError` (la sesión vencida antes de correr, o lo que
// la action lanzó). `enviarAccion()` no marca cuál es cuál: **la validación y el `serverError` se distinguen sólo por `error.codigo`** (ningún camino de `safe-action.ts` da
// `validacion`).
export function textoDelFallo(envio: Extract<Envio<unknown>, { ok: false }>): TextoDelAviso {
  if ('sinRed' in envio) {
    return {
      texto: 'No pudimos llegar al servidor. Se vuelve a mandar solo cuando vuelva la conexión.',
      salida: 'reintentar',
    }
  }
  if (envio.error.codigo === 'validacion') {
    return {
      texto: 'No se pudo guardar: la hoja mandó algo que no esperábamos. Recárgala.',
      salida: 'recargar',
    }
  }
  if (envio.error.codigo === 'no_autenticado') {
    return { texto: MENSAJE_SESION_VENCIDA, salida: 'ingresar' }
  }
  return { texto: NO_SE_PUDO, salida: 'reintentar' }
}
