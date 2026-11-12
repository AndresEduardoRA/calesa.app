import { z } from 'zod'

// El transporte de una unidad (6.08-2): naviera, puertos, contenedor, booking, fechas y notas. La base lo guarda por `transporte_guardar` (con versión) y vuelve a revisarlo todo; aquí vive
// lo que la interfaz repite con **los mismos textos** para ahorrar un viaje (D16) y el mapa de qué campo nombra cada rechazo.
export const LARGO_MAXIMO_DE_LAS_NOTAS_DE_TRANSPORTE = 2000
export const LARGO_MAXIMO_DEL_CONTENEDOR = 40
export const MOTIVO_SIN_PERMISO_DE_TRANSPORTE =
  'No tienes permiso para editar el transporte de este origen.'
export const TEXTO_SIN_NAVIERAS = 'Todavía no hay navieras cargadas.'
export const TEXTO_SIN_TRANSPORTE = 'Esta unidad todavía no tiene transporte cargado.'
export const TEXTO_DEL_TRANSPORTE_QUE_SIGUE_AL_VEHICULO =
  'Sigue al vehículo: su transporte es el del vehículo de este proyecto.'
export const TEXTO_DEL_TRANSPORTE_SIN_VEHICULO =
  'Este proyecto no tiene vehículo: el transporte propio de un repuesto todavía no se carga.'

/** Lo que dice el hueco «Transporte» de un ítem de repuesto (D5 de 8.13-2): sigue al vehículo de su proyecto; sin vehículo, que todavía no se carga. */
export function textoDelTransporteDelItem(
  proyecto: { vehiculoId: string | null } | undefined,
): string {
  return proyecto?.vehiculoId
    ? TEXTO_DEL_TRANSPORTE_QUE_SIGUE_AL_VEHICULO
    : TEXTO_DEL_TRANSPORTE_SIN_VEHICULO
}

/** La fila de `transportes` de un vehículo, con la versión (`actualizado_en`) que se leyó. */
export type Transporte = {
  id: string
  navieraId: string | null
  puertoOrigenId: string | null
  puertoDestinoId: string | null
  contenedor: string | null
  booking: string | null
  zarpeEl: string | null
  etaEl: string | null
  arriboEl: string | null
  notas: string | null
  actualizadoEn: string
}

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const esquemaDeTransporte = z.object({
  id: z.guid(),
  naviera_id: z.guid().nullable(),
  puerto_origen_id: z.guid().nullable(),
  puerto_destino_id: z.guid().nullable(),
  contenedor: z.string().nullable(),
  booking: z.string().nullable(),
  zarpe_el: fecha.nullable(),
  eta_el: fecha.nullable(),
  arribo_el: fecha.nullable(),
  notas: z.string().nullable(),
  actualizado_en: z.string(),
})

/** La fila leída de `transportes`; nulo si no tiene la forma esperada. */
export function transporteDesde(fila: unknown): Transporte | null {
  const r = esquemaDeTransporte.safeParse(fila)
  if (!r.success) {
    return null
  }
  const d = r.data
  return {
    id: d.id,
    navieraId: d.naviera_id,
    puertoOrigenId: d.puerto_origen_id,
    puertoDestinoId: d.puerto_destino_id,
    contenedor: d.contenedor,
    booking: d.booking,
    zarpeEl: d.zarpe_el,
    etaEl: d.eta_el,
    arriboEl: d.arribo_el,
    notas: d.notas,
    actualizadoEn: d.actualizado_en,
  }
}

/** Los campos del formulario: texto tal cual se escribe; `''` es «sin dato». Las fechas son `YYYY-MM-DD` (`date`, sin hora: D18). */
export type CampoDeTransporte =
  | 'naviera'
  | 'puertoOrigen'
  | 'puertoDestino'
  | 'contenedor'
  | 'booking'
  | 'zarpe'
  | 'eta'
  | 'arribo'
  | 'notas'
export type ValoresDeTransporte = Record<CampoDeTransporte, string>
export type ErroresDeTransporte = Partial<Record<CampoDeTransporte, string>>

export const CAMPOS_DE_TRANSPORTE: readonly CampoDeTransporte[] = [
  'naviera',
  'puertoOrigen',
  'puertoDestino',
  'contenedor',
  'booking',
  'zarpe',
  'eta',
  'arribo',
  'notas',
]

// La clave que `transporte_guardar` admite para cada campo.
const CLAVE_DE_LA_BASE = {
  naviera: 'naviera_id',
  puertoOrigen: 'puerto_origen_id',
  puertoDestino: 'puerto_destino_id',
  contenedor: 'contenedor',
  booking: 'booking',
  zarpe: 'zarpe_el',
  eta: 'eta_el',
  arribo: 'arribo_el',
  notas: 'notas',
} as const satisfies Record<CampoDeTransporte, string>

export type CambiosDeTransporte = Partial<
  Record<(typeof CLAVE_DE_LA_BASE)[CampoDeTransporte], string | null>
>

export const VALORES_VACIOS_DE_TRANSPORTE: ValoresDeTransporte = {
  naviera: '',
  puertoOrigen: '',
  puertoDestino: '',
  contenedor: '',
  booking: '',
  zarpe: '',
  eta: '',
  arribo: '',
  notas: '',
}

/** Los valores del formulario a partir de lo guardado (nulo = unidad sin transporte). */
export function valoresDeTransporte(t: Transporte | null): ValoresDeTransporte {
  if (t === null) {
    return VALORES_VACIOS_DE_TRANSPORTE
  }
  return {
    naviera: t.navieraId ?? '',
    puertoOrigen: t.puertoOrigenId ?? '',
    puertoDestino: t.puertoDestinoId ?? '',
    contenedor: t.contenedor ?? '',
    booking: t.booking ?? '',
    zarpe: t.zarpeEl ?? '',
    eta: t.etaEl ?? '',
    arribo: t.arriboEl ?? '',
    notas: t.notas ?? '',
  }
}

/** Lo que la base guarda de un valor: contenedor y booking en mayúsculas y sin ningún espacio; notas recortadas; `''` es `null`. */
export function normalizarCampo(campo: CampoDeTransporte, texto: string): string | null {
  const limpio =
    campo === 'contenedor' || campo === 'booking'
      ? texto.replace(/\s/g, '').toUpperCase()
      : texto.trim()
  return limpio === '' ? null : limpio
}

const FORMA_DE_CONTENEDOR = /^[A-Z0-9./-]{1,40}$/

function errorDeCodigo(campo: 'contenedor' | 'booking'): string {
  return `El ${campo} lleva sólo letras, dígitos, punto, barra o guion (hasta ${LARGO_MAXIMO_DEL_CONTENEDOR}).`
}

type Cambio = (campo: CampoDeTransporte) => boolean

function erroresDeTexto(valores: ValoresDeTransporte, cambio: Cambio): ErroresDeTransporte {
  const errores: ErroresDeTransporte = {}
  for (const c of ['contenedor', 'booking'] as const) {
    const v = normalizarCampo(c, valores[c])
    if (cambio(c) && v !== null && !FORMA_DE_CONTENEDOR.test(v)) {
      errores[c] = errorDeCodigo(c)
    }
  }
  const notas = normalizarCampo('notas', valores.notas) ?? ''
  if (cambio('notas') && notas.length > LARGO_MAXIMO_DE_LAS_NOTAS_DE_TRANSPORTE) {
    errores.notas = 'Las notas llevan hasta 2.000 caracteres.'
  }
  return errores
}

// Un valor sin dato no se compara: la base sólo compara fechas puestas.
const antesDe = (a: string | null, b: string | null) => a !== null && b !== null && a < b

function erroresDeFechas(valores: ValoresDeTransporte, cambio: Cambio): ErroresDeTransporte {
  if (!cambio('zarpe') && !cambio('eta') && !cambio('arribo')) {
    return {}
  }
  const zarpe = normalizarCampo('zarpe', valores.zarpe)
  const errores: ErroresDeTransporte = {}
  if (antesDe(normalizarCampo('eta', valores.eta), zarpe)) {
    errores.eta = 'La ETA no puede ser antes del zarpe.'
  }
  if (antesDe(normalizarCampo('arribo', valores.arribo), zarpe)) {
    errores.arribo = 'El arribo no puede ser antes del zarpe.'
  }
  return errores
}

/**
 * Lo que la interfaz repite de la base, **sólo en lo que cambió** respecto de lo leído (lo ya guardado se conserva aunque hoy no pasara): contenedor y booking, notas y el orden de
 * las fechas. La base manda si difieren.
 */
export function validarTransporte(
  original: ValoresDeTransporte,
  valores: ValoresDeTransporte,
): ErroresDeTransporte {
  const cambio: Cambio = (c) => normalizarCampo(c, original[c]) !== normalizarCampo(c, valores[c])
  return { ...erroresDeTexto(valores, cambio), ...erroresDeFechas(valores, cambio) }
}

/** Sólo lo que la persona cambió respecto de lo leído, con la clave de la base: `null` vacía el dato y una clave ausente no cambia. `null` si no cambió nada. */
export function cambiosDeTransporte(
  original: ValoresDeTransporte,
  valores: ValoresDeTransporte,
): CambiosDeTransporte | null {
  const cambios: CambiosDeTransporte = {}
  for (const campo of CAMPOS_DE_TRANSPORTE) {
    const nuevo = normalizarCampo(campo, valores[campo])
    if (nuevo !== normalizarCampo(campo, original[campo])) {
      cambios[CLAVE_DE_LA_BASE[campo]] = nuevo
    }
  }
  return Object.keys(cambios).length === 0 ? null : cambios
}

// El `hint` de un rechazo de la base nombra el campo del formulario (V21).
const CAMPO_DEL_HINT: Record<string, CampoDeTransporte> = {
  naviera_id: 'naviera',
  puerto_origen_id: 'puertoOrigen',
  puerto_destino_id: 'puertoDestino',
  contenedor: 'contenedor',
  booking: 'booking',
  zarpe_el: 'zarpe',
  eta_el: 'eta',
  arribo_el: 'arribo',
  notas: 'notas',
}

/** El campo que nombra el `hint` de un rechazo; nulo si no es un campo (p. ej. `transporte`: apagado en el flujo). */
export function campoDelRechazo(hint: string | null | undefined): CampoDeTransporte | null {
  return hint ? (CAMPO_DEL_HINT[hint] ?? null) : null
}

/** El rechazo de la base por campo, o `undefined` si el `hint` no nombra uno. */
export function porCampoDe(
  hint: string | null | undefined,
  mensaje: string,
): ErroresDeTransporte | undefined {
  const campo = campoDelRechazo(hint)
  return campo ? { [campo]: mensaje } : undefined
}
