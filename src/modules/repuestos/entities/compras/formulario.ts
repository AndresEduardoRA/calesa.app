// El formulario de una compra de un proyecto (8.11-3, C1). Puro. Anticipa las reglas de `_repuesto_compra_de_datos` (8.11-1) con **sus textos**, para decir el motivo
// junto al campo antes de mandar; la base vuelve a validarlo todo. El monto en base y la tasa los pone la base al guardar: acá nunca viajan ni se calculan.
import { avisoDeNumero, leerNumeroTipeado } from '@/shared/lib/numero-tipeado'
import type { FilaDeCompra } from './compra'

export const LARGO_MAXIMO_DE_PROVEEDOR = 200
export const LARGO_MAXIMO_DE_NOTAS = 2000

/** Lo que escribe la persona, tal cual (el monto como texto; `itemId: ''` = sin ítem, `comprobanteRuta: ''` = sin comprobante). */
export type BorradorDeCompra = {
  itemId: string
  proveedor: string
  moneda: string
  monto: string
  fecha: string
  notas: string
  comprobanteRuta: string
}

export function borradorDeCompra(
  fila: FilaDeCompra,
  formatearMonto: (n: number) => string,
): BorradorDeCompra {
  return {
    itemId: fila.itemId ?? '',
    proveedor: fila.proveedor ?? '',
    moneda: fila.moneda,
    monto: formatearMonto(fila.monto),
    fecha: fila.fecha,
    notas: fila.notas ?? '',
    comprobanteRuta: fila.comprobanteRuta ?? '',
  }
}

/** «Registrar compra»: en la moneda base y con la fecha de hoy (`YYYY-MM-DD`, en la zona de la empresa). */
export function borradorNuevoDeCompra(monedaBase: string, hoy: string): BorradorDeCompra {
  return {
    itemId: '',
    proveedor: '',
    moneda: monedaBase,
    monto: '',
    fecha: hoy,
    notas: '',
    comprobanteRuta: '',
  }
}

/** Lo validado: el texto vacío ya en nulo y la moneda en mayúsculas. */
export type DatosDeCompra = {
  itemId: string | null
  proveedor: string | null
  moneda: string
  monto: number
  fecha: string
  notas: string | null
  comprobanteRuta: string | null
}

export type ValidacionDeCompra =
  { ok: true; datos: DatosDeCompra } | { ok: false; errores: Record<string, string> }

const FECHA = /^\d{4}-\d{2}-\d{2}$/

function vacioANulo(texto: string): string | null {
  const limpio = texto.trim()
  return limpio === '' ? null : limpio
}

// El monto con los textos de la base. 0 vale (D11 de 8.11-1): una compra sin costo no es una compra sin monto.
function leerMonto(texto: string, locale: string): { monto?: number; error?: string } {
  const leido = leerNumeroTipeado(texto, locale)
  if (!leido.ok) return { error: avisoDeNumero(texto, leido.motivo, locale) }
  if (leido.valor === null) return { error: 'Falta el monto.' }
  if (leido.valor < 0) return { error: 'El monto no puede ser negativo.' }
  if (leido.decimales > 2) return { error: 'El monto lleva como mucho dos decimales.' }
  return { monto: leido.valor }
}

function erroresDeTexto(b: BorradorDeCompra): Record<string, string> {
  const errores: Record<string, string> = {}
  if (b.proveedor.trim().length > LARGO_MAXIMO_DE_PROVEEDOR) {
    errores['proveedor'] = 'El proveedor va en 200 caracteres como mucho.'
  }
  if (!/^[A-Za-z]{3}$/.test(b.moneda.trim())) {
    errores['moneda'] = 'Elige la moneda de la compra.'
  }
  if (!FECHA.test(b.fecha)) {
    errores['fecha'] = 'Falta la fecha.'
  }
  if (b.notas.trim().length > LARGO_MAXIMO_DE_NOTAS) {
    errores['notas'] = 'Las notas van en 2000 caracteres como mucho.'
  }
  return errores
}

/** Valida el formulario. El error de cada campo va por su clave del borrador. */
export function validarCompra(
  borrador: BorradorDeCompra,
  { locale }: { locale: string },
): ValidacionDeCompra {
  const errores = erroresDeTexto(borrador)
  const { monto, error } = leerMonto(borrador.monto, locale)
  if (error !== undefined) errores['monto'] = error
  if (Object.keys(errores).length > 0 || monto === undefined) {
    return { ok: false, errores }
  }
  return {
    ok: true,
    datos: {
      itemId: vacioANulo(borrador.itemId),
      proveedor: vacioANulo(borrador.proveedor),
      moneda: borrador.moneda.trim().toUpperCase(),
      monto,
      fecha: borrador.fecha,
      notas: vacioANulo(borrador.notas),
      comprobanteRuta: vacioANulo(borrador.comprobanteRuta),
    },
  }
}

/** Las claves cerradas de `p_datos` de `repuesto_compra_guardar`, sin `proyecto_id` (lo pone la escritura al crear). */
export type ClavesDeCompra = {
  item_id?: string | null
  proveedor?: string | null
  moneda?: string
  monto?: number
  fecha?: string
  notas?: string | null
  comprobante_ruta?: string | null
}

/** Todo lo validado, para crear. */
export function datosDeCompra(d: DatosDeCompra): ClavesDeCompra {
  return {
    item_id: d.itemId,
    proveedor: d.proveedor,
    moneda: d.moneda,
    monto: d.monto,
    fecha: d.fecha,
    notas: d.notas,
    comprobante_ruta: d.comprobanteRuta,
  }
}

/** Para editar: sólo lo que cambió (nulo si nada). Nunca `monto_base` ni la tasa: si la moneda no cambia, la base conserva la tasa guardada. */
export function cambiosDeCompra(
  original: FilaDeCompra,
  nuevo: DatosDeCompra,
): ClavesDeCompra | null {
  const c: ClavesDeCompra = {}
  if (nuevo.itemId !== original.itemId) c.item_id = nuevo.itemId
  if (nuevo.proveedor !== original.proveedor) c.proveedor = nuevo.proveedor
  if (nuevo.moneda !== original.moneda) c.moneda = nuevo.moneda
  if (nuevo.monto !== original.monto) c.monto = nuevo.monto
  if (nuevo.fecha !== original.fecha) c.fecha = nuevo.fecha
  if (nuevo.notas !== original.notas) c.notas = nuevo.notas
  if (nuevo.comprobanteRuta !== original.comprobanteRuta) c.comprobante_ruta = nuevo.comprobanteRuta
  return Object.keys(c).length === 0 ? null : c
}
