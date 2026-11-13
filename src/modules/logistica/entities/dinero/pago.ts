import { z } from 'zod'
import { formatearFechaHora } from '@/shared/lib/fechas'
import { leerMontoDeDinero } from './monto-tipeado'

// Un pago de una unidad (6.11-2) y su formulario. Como en los gastos, el monto en base y la tasa los calcula la base: aquí nunca se multiplica. Un pago confirmado queda sellado
// (quién y cuándo lo puso la base) y es de sólo lectura; se corrige anulándolo con un motivo (D2 y D3 de 6.10).

const esquemaDePago = z.object({
  id: z.guid(),
  vehiculo_id: z.guid().nullable(),
  lead_id: z.guid().nullable(),
  concepto: z.string(),
  moneda: z.string(),
  monto: z.number(),
  tipo_cambio_id: z.guid().nullable(),
  tipo_cambio_aplicado: z.number().nullable(),
  monto_base: z.number(),
  metodo: z.string().nullable(),
  fecha: z.string(),
  confirmado: z.boolean(),
  confirmado_por: z.guid().nullable(),
  confirmado_en: z.string().nullable(),
  comprobante_ruta: z.string().nullable(),
  notas: z.string().nullable(),
  actualizado_en: z.string(),
})

export type Pago = {
  id: string
  vehiculoId: string | null
  leadId: string | null
  concepto: string
  moneda: string
  monto: number
  tipoCambioId: string | null
  tipoCambioAplicado: number | null
  montoBase: number
  metodo: string | null
  fecha: string
  confirmado: boolean
  confirmadoPor: string | null
  // El nombre de quien confirmó, si se pudo leer; nulo = «otra persona».
  confirmadoPorNombre: string | null
  confirmadoEn: string | null
  comprobanteRuta: string | null
  notas: string | null
  actualizadoEn: string
}

/** Las filas de `pagos` como pagos; nulo si alguna no tiene la forma esperada. `nombres`: id de persona → nombre, para el sello. */
export function pagosDesde(
  datos: unknown,
  nombres: Readonly<Record<string, string>>,
): Pago[] | null {
  const leido = z.array(esquemaDePago).safeParse(datos)
  if (!leido.success) {
    return null
  }
  return leido.data.map((p) => ({
    id: p.id,
    vehiculoId: p.vehiculo_id,
    leadId: p.lead_id,
    concepto: p.concepto,
    moneda: p.moneda,
    monto: p.monto,
    tipoCambioId: p.tipo_cambio_id,
    tipoCambioAplicado: p.tipo_cambio_aplicado,
    montoBase: p.monto_base,
    metodo: p.metodo,
    fecha: p.fecha,
    confirmado: p.confirmado,
    confirmadoPor: p.confirmado_por,
    confirmadoPorNombre: p.confirmado_por === null ? null : (nombres[p.confirmado_por] ?? null),
    confirmadoEn: p.confirmado_en,
    comprobanteRuta: p.comprobante_ruta,
    notas: p.notas,
    actualizadoEn: p.actualizado_en,
  }))
}

/** El resultado de registrar o corregir: lo único que la base decide (la tasa y el equivalente en base) y la versión nueva. */
export const esquemaDePagoGuardado = z.object({
  id: z.guid(),
  actualizado_en: z.string(),
  tipo_cambio_aplicado: z.number().nullable().optional(),
  monto_base: z.number().optional(),
})

/** El resultado de confirmar: la versión nueva y el sello que puso la base. */
export const esquemaDePagoConfirmado = z.object({
  id: z.guid(),
  actualizado_en: z.string(),
  confirmado_por: z.guid().nullable().optional(),
  confirmado_en: z.string().nullable().optional(),
})

export type EstadoDelPago = 'sin_confirmar' | 'confirmado'

export function estadoDelPago(pago: Pick<Pago, 'confirmado'>): EstadoDelPago {
  return pago.confirmado ? 'confirmado' : 'sin_confirmar'
}

/** «Confirmado por Ana el 11 nov 2026, 14:30»; sin nombre, «otra persona». Nulo si no está confirmado. */
export function textoDelSello(
  pago: Pick<Pago, 'confirmado' | 'confirmadoPorNombre' | 'confirmadoEn'>,
  zona: string,
): string | null {
  if (!pago.confirmado) {
    return null
  }
  const quien = pago.confirmadoPorNombre ?? 'otra persona'
  return pago.confirmadoEn === null
    ? `Confirmado por ${quien}`
    : `Confirmado por ${quien} el ${formatearFechaHora(pago.confirmadoEn, { zona })}`
}

export const tituloDeConfirmarPago = (pago: Pick<Pago, 'concepto'>) =>
  `Confirmar el pago «${pago.concepto}»`
export const tituloDeEliminarPago = (pago: Pick<Pago, 'concepto'>) =>
  `Eliminar el pago «${pago.concepto}»`
export const tituloDeAnularPago = (pago: Pick<Pago, 'concepto'>) =>
  `Anular el pago «${pago.concepto}»`

export const LARGO_MAXIMO_DE_CONCEPTO = 200
export const LARGO_MAXIMO_DE_METODO = 100
export const LARGO_MAXIMO_DE_NOTAS_DE_PAGO = 1000

/** Lo que escribe la persona en el formulario, tal cual (el monto como texto). */
export type BorradorDePago = {
  concepto: string
  moneda: string
  monto: string
  tipoCambioId: string
  metodo: string
  fecha: string
  notas: string
  comprobanteRuta: string
}

export function borradorDePago(pago: Pago, formatearMonto: (n: number) => string): BorradorDePago {
  return {
    concepto: pago.concepto,
    moneda: pago.moneda,
    monto: formatearMonto(pago.monto),
    tipoCambioId: pago.tipoCambioId ?? '',
    metodo: pago.metodo ?? '',
    fecha: pago.fecha,
    notas: pago.notas ?? '',
    comprobanteRuta: pago.comprobanteRuta ?? '',
  }
}

/** El formulario vacío de «Registrar pago»: en la moneda base y con la fecha de hoy (`YYYY-MM-DD`, en la zona de la empresa). */
export function borradorNuevoDePago(monedaBase: string, hoy: string): BorradorDePago {
  return {
    concepto: '',
    moneda: monedaBase,
    monto: '',
    tipoCambioId: '',
    metodo: '',
    fecha: hoy,
    notas: '',
    comprobanteRuta: '',
  }
}

/** Lo validado, listo para mandar. */
export type DatosDePago = {
  concepto: string
  moneda: string
  monto: number
  tipoCambioId: string | null
  metodo: string | null
  fecha: string
  notas: string | null
  comprobanteRuta: string | null
}

export type ContextoDeValidacionDePago = {
  monedaBase: string
  locale: string
  // Los tipos de cambio activos que unen la moneda elegida con la base (`opcionesDeTipoDeCambio`).
  tiposDisponibles: number
}

export type ValidacionDePago =
  { ok: true; datos: DatosDePago } | { ok: false; errores: Record<string, string> }

const FECHA = /^\d{4}-\d{2}-\d{2}$/

function vacioANulo(texto: string): string | null {
  const limpio = texto.trim()
  return limpio === '' ? null : limpio
}

function erroresDeCampos(borrador: BorradorDePago): Record<string, string> {
  const errores: Record<string, string> = {}
  const concepto = borrador.concepto.trim()
  if (concepto === '') {
    errores['concepto'] = 'Escribe el concepto del pago.'
  } else if (concepto.length > LARGO_MAXIMO_DE_CONCEPTO) {
    errores['concepto'] = `El concepto admite hasta ${String(LARGO_MAXIMO_DE_CONCEPTO)} letras.`
  }
  if (!/^[A-Za-z]{3}$/.test(borrador.moneda)) {
    errores['moneda'] = 'Elige una moneda.'
  }
  if (!FECHA.test(borrador.fecha)) {
    errores['fecha'] = 'Elige la fecha del pago.'
  }
  if (borrador.metodo.trim().length > LARGO_MAXIMO_DE_METODO) {
    errores['metodo'] = `El método admite hasta ${String(LARGO_MAXIMO_DE_METODO)} letras.`
  }
  if (borrador.notas.trim().length > LARGO_MAXIMO_DE_NOTAS_DE_PAGO) {
    errores['notas'] = `Las notas admiten hasta ${String(LARGO_MAXIMO_DE_NOTAS_DE_PAGO)} letras.`
  }
  return errores
}

/** Valida el formulario con las reglas de la base (monto > 0, tipo de cambio sólo en otra moneda). El error de cada campo va por su clave del borrador. */
export function validarPago(
  borrador: BorradorDePago,
  contexto: ContextoDeValidacionDePago,
): ValidacionDePago {
  const errores = erroresDeCampos(borrador)
  const { monedaBase, locale, tiposDisponibles } = contexto
  const { monto, error } = leerMontoDeDinero(borrador.monto, locale, { positivo: true })
  if (error !== undefined) {
    errores['monto'] = error
  }
  const enBase = borrador.moneda === monedaBase
  if (!enBase && borrador.tipoCambioId === '') {
    errores['tipoCambioId'] =
      tiposDisponibles === 0
        ? `No hay un tipo de cambio activo para ${borrador.moneda}. Pídele a quien administra la empresa que lo configure.`
        : 'Elige el tipo de cambio.'
  }
  if (Object.keys(errores).length > 0 || monto === undefined) {
    return { ok: false, errores }
  }
  return {
    ok: true,
    datos: {
      concepto: borrador.concepto.trim(),
      moneda: borrador.moneda.toUpperCase(),
      monto,
      tipoCambioId: enBase ? null : borrador.tipoCambioId,
      metodo: vacioANulo(borrador.metodo),
      fecha: borrador.fecha,
      notas: vacioANulo(borrador.notas),
      comprobanteRuta: vacioANulo(borrador.comprobanteRuta),
    },
  }
}

/** Las claves cerradas de `p_cambios` de `pago_guardar` que esta interfaz manda (nunca `lead_id`, D3). */
export type CambiosDePago = {
  concepto?: string
  moneda?: string
  monto?: number
  tipo_cambio_id?: string | null
  metodo?: string | null
  fecha?: string
  notas?: string | null
  comprobante_ruta?: string | null
}

/**
 * Los cambios de `pago_guardar` (`p_cambios`): sólo lo que cambió. El tipo de cambio viaja únicamente si cambió la moneda o el tipo (D19 de 6.10-1): con sólo otro monto, la base usa la tasa
 * guardada. Nulo si no cambió nada.
 */
export function cambiosDePago(original: Pago, nuevo: DatosDePago): CambiosDePago | null {
  const cambios: CambiosDePago = {}
  if (nuevo.concepto !== original.concepto) cambios.concepto = nuevo.concepto
  if (nuevo.moneda !== original.moneda) cambios.moneda = nuevo.moneda
  if (nuevo.monto !== original.monto) cambios.monto = nuevo.monto
  if (nuevo.moneda !== original.moneda || nuevo.tipoCambioId !== original.tipoCambioId) {
    cambios.tipo_cambio_id = nuevo.tipoCambioId
  }
  if (nuevo.metodo !== original.metodo) cambios.metodo = nuevo.metodo
  if (nuevo.fecha !== original.fecha) cambios.fecha = nuevo.fecha
  if (nuevo.notas !== original.notas) cambios.notas = nuevo.notas
  if (nuevo.comprobanteRuta !== original.comprobanteRuta) {
    cambios.comprobante_ruta = nuevo.comprobanteRuta
  }
  return Object.keys(cambios).length === 0 ? null : cambios
}
