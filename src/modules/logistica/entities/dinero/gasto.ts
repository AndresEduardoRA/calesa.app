import { z } from 'zod'
import { leerMontoDeDinero } from './monto-tipeado'

// Un gasto de una unidad (6.11-1) y su formulario. El monto en base y la tasa los calcula la base al guardar: aquí nunca se multiplica (el equivalente que se muestra
// es el que ella devolvió). Reglas de la base que se anticipan para escribir el motivo junto al campo: categoría obligatoria, monto ≥ 0 con a lo sumo dos decimales
// (D16 y D21 de 6.10-1) y tipo de cambio obligatorio si la moneda no es la base y prohibido si lo es (D4).

const esquemaDeGasto = z.object({
  id: z.guid(),
  vehiculo_id: z.guid(),
  categoria_id: z.guid(),
  categoria: z.object({ nombre: z.string() }).nullable(),
  moneda: z.string(),
  monto: z.number(),
  tipo_cambio_id: z.guid().nullable(),
  tipo_cambio_aplicado: z.number().nullable(),
  monto_base: z.number(),
  fecha: z.string(),
  proveedor: z.string().nullable(),
  comprobante_ruta: z.string().nullable(),
  lote_id: z.guid().nullable(),
  notas: z.string().nullable(),
  actualizado_en: z.string(),
})

export type Gasto = {
  id: string
  vehiculoId: string
  categoriaId: string
  categoriaNombre: string
  moneda: string
  monto: number
  tipoCambioId: string | null
  tipoCambioAplicado: number | null
  montoBase: number
  fecha: string
  proveedor: string | null
  comprobanteRuta: string | null
  // Un gasto prorrateado a un grupo lleva el lote (6.11-4).
  loteId: string | null
  notas: string | null
  actualizadoEn: string
}

/** Las filas de `gastos` (con su categoría embebida) como gastos; nulo si alguna no tiene la forma esperada. */
export function gastosDesde(datos: unknown): Gasto[] | null {
  const leido = z.array(esquemaDeGasto).safeParse(datos)
  if (!leido.success) {
    return null
  }
  return leido.data.map((g) => ({
    id: g.id,
    vehiculoId: g.vehiculo_id,
    categoriaId: g.categoria_id,
    categoriaNombre: g.categoria?.nombre ?? 'Sin categoría',
    moneda: g.moneda,
    monto: g.monto,
    tipoCambioId: g.tipo_cambio_id,
    tipoCambioAplicado: g.tipo_cambio_aplicado,
    montoBase: g.monto_base,
    fecha: g.fecha,
    proveedor: g.proveedor,
    comprobanteRuta: g.comprobante_ruta,
    loteId: g.lote_id,
    notas: g.notas,
    actualizadoEn: g.actualizado_en,
  }))
}

/** El resultado de registrar o corregir: lo único que la base decide (la tasa y el equivalente en base) y la versión nueva. */
export const esquemaDeGastoGuardado = z.object({
  id: z.guid(),
  actualizado_en: z.string(),
  tipo_cambio_aplicado: z.number().nullable().optional(),
  monto_base: z.number().optional(),
})

export const LARGO_MAXIMO_DE_PROVEEDOR = 120
export const LARGO_MAXIMO_DE_NOTAS = 1000

/** Lo que escribe la persona en el formulario, tal cual (el monto como texto). */
export type BorradorDeGasto = {
  categoriaId: string
  moneda: string
  monto: string
  tipoCambioId: string
  fecha: string
  proveedor: string
  notas: string
  comprobanteRuta: string
}

export function borradorDeGasto(
  gasto: Gasto,
  formatearMonto: (n: number) => string,
): BorradorDeGasto {
  return {
    categoriaId: gasto.categoriaId,
    moneda: gasto.moneda,
    monto: formatearMonto(gasto.monto),
    tipoCambioId: gasto.tipoCambioId ?? '',
    fecha: gasto.fecha,
    proveedor: gasto.proveedor ?? '',
    notas: gasto.notas ?? '',
    comprobanteRuta: gasto.comprobanteRuta ?? '',
  }
}

/** El formulario vacío de «Registrar gasto»: en la moneda base y con la fecha de hoy (`YYYY-MM-DD`, en la zona de la empresa). */
export function borradorNuevoDeGasto(monedaBase: string, hoy: string): BorradorDeGasto {
  return {
    categoriaId: '',
    moneda: monedaBase,
    monto: '',
    tipoCambioId: '',
    fecha: hoy,
    proveedor: '',
    notas: '',
    comprobanteRuta: '',
  }
}

/** Lo validado, listo para mandar. */
export type DatosDeGasto = {
  categoriaId: string
  moneda: string
  monto: number
  tipoCambioId: string | null
  fecha: string
  proveedor: string | null
  notas: string | null
  comprobanteRuta: string | null
}

export type ContextoDeValidacion = {
  monedaBase: string
  locale: string
  // Los tipos de cambio activos que unen la moneda elegida con la base (`opcionesDeTipoDeCambio`).
  tiposDisponibles: number
}

export type ValidacionDeGasto =
  { ok: true; datos: DatosDeGasto } | { ok: false; errores: Record<string, string> }

const FECHA = /^\d{4}-\d{2}-\d{2}$/

function vacioANulo(texto: string): string | null {
  const limpio = texto.trim()
  return limpio === '' ? null : limpio
}

// Los campos de texto y de elección simple, sin el monto ni el tipo de cambio.
function erroresDeCampos(borrador: BorradorDeGasto): Record<string, string> {
  const errores: Record<string, string> = {}
  if (borrador.categoriaId === '') {
    errores['categoriaId'] = 'Elige una categoría.'
  }
  if (!/^[A-Za-z]{3}$/.test(borrador.moneda)) {
    errores['moneda'] = 'Elige una moneda.'
  }
  if (!FECHA.test(borrador.fecha)) {
    errores['fecha'] = 'Elige la fecha del gasto.'
  }
  if (borrador.proveedor.trim().length > LARGO_MAXIMO_DE_PROVEEDOR) {
    errores['proveedor'] = `El proveedor admite hasta ${String(LARGO_MAXIMO_DE_PROVEEDOR)} letras.`
  }
  if (borrador.notas.trim().length > LARGO_MAXIMO_DE_NOTAS) {
    errores['notas'] = `Las notas admiten hasta ${String(LARGO_MAXIMO_DE_NOTAS)} letras.`
  }
  return errores
}

/** Valida el formulario con las reglas de la base. El error de cada campo va por su clave del borrador. */
export function validarGasto(
  borrador: BorradorDeGasto,
  contexto: ContextoDeValidacion,
): ValidacionDeGasto {
  const errores = erroresDeCampos(borrador)
  const { monedaBase, locale, tiposDisponibles } = contexto
  const { monto, error } = leerMontoDeDinero(borrador.monto, locale, { positivo: false })
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
      categoriaId: borrador.categoriaId,
      moneda: borrador.moneda.toUpperCase(),
      monto,
      tipoCambioId: enBase ? null : borrador.tipoCambioId,
      fecha: borrador.fecha,
      proveedor: vacioANulo(borrador.proveedor),
      notas: vacioANulo(borrador.notas),
      comprobanteRuta: vacioANulo(borrador.comprobanteRuta),
    },
  }
}

/** Las claves cerradas de `p_cambios` de `gasto_guardar`. */
export type CambiosDeGasto = {
  categoria_id?: string
  moneda?: string
  monto?: number
  tipo_cambio_id?: string | null
  fecha?: string
  proveedor?: string | null
  notas?: string | null
  comprobante_ruta?: string | null
}

/**
 * Los cambios de `gasto_guardar` (`p_cambios`): sólo lo que cambió. El tipo de cambio viaja únicamente si cambió la moneda o el tipo (D19): con sólo otro
 * monto, la base usa la tasa guardada. Nulo si no cambió nada.
 */
export function cambiosDeGasto(original: Gasto, nuevo: DatosDeGasto): CambiosDeGasto | null {
  const cambios: CambiosDeGasto = {}
  if (nuevo.categoriaId !== original.categoriaId) cambios.categoria_id = nuevo.categoriaId
  if (nuevo.moneda !== original.moneda) cambios.moneda = nuevo.moneda
  if (nuevo.monto !== original.monto) cambios.monto = nuevo.monto
  if (nuevo.moneda !== original.moneda || nuevo.tipoCambioId !== original.tipoCambioId) {
    cambios.tipo_cambio_id = nuevo.tipoCambioId
  }
  if (nuevo.fecha !== original.fecha) cambios.fecha = nuevo.fecha
  if (nuevo.proveedor !== original.proveedor) cambios.proveedor = nuevo.proveedor
  if (nuevo.notas !== original.notas) cambios.notas = nuevo.notas
  if (nuevo.comprobanteRuta !== original.comprobanteRuta) {
    cambios.comprobante_ruta = nuevo.comprobanteRuta
  }
  return Object.keys(cambios).length === 0 ? null : cambios
}

/** El título de la confirmación de eliminar nombra el gasto: «Eliminar el gasto de Flete del 10 nov 2026». El monto va aparte, con `<Monto>`. */
export function tituloDeEliminarGasto(
  gasto: Pick<Gasto, 'categoriaNombre'>,
  fechaEscrita: string,
): string {
  return `Eliminar el gasto de ${gasto.categoriaNombre} del ${fechaEscrita}`
}
