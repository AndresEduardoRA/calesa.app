import { z } from 'zod'

// Los catálogos de repuestos (8.08-2): `repuestos_catalogos.catalogo` es una de cuatro claves del `check` del esquema, no un dato de la empresa, así que
// el nombre de cada catálogo es fijo, como `PROPOSITOS_DE_CATEGORIA` (D19). Los VALORES de cada catálogo sí salen de la base. Si una migración cambia el
// `check`, `catalogo.test.ts` (K1) obliga a cambiar esta lista.
export const CATALOGOS_DE_REPUESTOS = [
  { clave: 'tipo_pieza', nombre: 'Tipo de pieza', nombreDelValor: 'tipo de pieza' },
  { clave: 'condicion', nombre: 'Condición', nombreDelValor: 'condición' },
  { clave: 'modo_transporte', nombre: 'Vía de transporte', nombreDelValor: 'vía' },
  { clave: 'pais_origen', nombre: 'País de origen', nombreDelValor: 'país' },
] as const

export type ClaveDeCatalogo = (typeof CATALOGOS_DE_REPUESTOS)[number]['clave']

const CLAVES = CATALOGOS_DE_REPUESTOS.map((c) => c.clave) as [ClaveDeCatalogo, ...ClaveDeCatalogo[]]

export function esClaveDeCatalogo(x: string): x is ClaveDeCatalogo {
  return (CLAVES as readonly string[]).includes(x)
}

export const esquemaDeClaveDeCatalogo = z.enum(CLAVES)

/** Un valor de un catálogo. `datos` (jsonb) no se lee: no tiene uso definido (D3 del 8.08-1). */
export type ValorDeCatalogo = {
  id: string
  catalogo: ClaveDeCatalogo
  nombre: string
  activo: boolean
  orden: number
}

const esquemaDeValor = z.object({
  id: z.guid(),
  catalogo: esquemaDeClaveDeCatalogo,
  nombre: z.string(),
  activo: z.boolean(),
  orden: z.number(),
})

/** Las filas de `repuestos_catalogos`; nulo si alguna no tiene la forma esperada. */
export function valoresDesde(datos: unknown): ValorDeCatalogo[] | null {
  const leido = z.array(esquemaDeValor).safeParse(datos)
  return leido.success ? leido.data : null
}

/** Por `orden` y, a igual orden, por nombre. */
export function ordenarValores(valores: readonly ValorDeCatalogo[]): ValorDeCatalogo[] {
  return [...valores].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'))
}

export const LARGO_MAXIMO_DE_NOMBRE_DE_VALOR = 60
export const ORDEN_MAXIMO_DE_VALOR = 32767 // `smallint`

/** El orden de un valor nuevo: al final de los que hay, sin pasar el tope. */
export function ordenSiguiente(valores: readonly ValorDeCatalogo[]): number {
  if (valores.length === 0) return 0
  return Math.min(Math.max(...valores.map((v) => v.orden)) + 1, ORDEN_MAXIMO_DE_VALOR)
}

/** Lo que escribe la persona en el formulario, tal cual (el orden como texto). */
export type BorradorDeValor = { nombre: string; activo: boolean; orden: string }

/** Lo validado, listo para mandar. */
export type DatosDeValor = { nombre: string; activo: boolean; orden: number }

export type ValidacionDeValor =
  { ok: true; datos: DatosDeValor } | { ok: false; errores: Record<string, string> }

export const BORRADOR_NUEVO_DE_VALOR: BorradorDeValor = { nombre: '', activo: true, orden: '0' }

export function borradorDeValor(v: ValorDeCatalogo): BorradorDeValor {
  return { nombre: v.nombre, activo: v.activo, orden: String(v.orden) }
}

/** Valida el formulario con las reglas de la base. El error de cada campo va por su clave del borrador. */
export function validarValor(b: BorradorDeValor): ValidacionDeValor {
  const errores: Record<string, string> = {}
  const nombre = b.nombre.trim()
  if (nombre === '') {
    errores['nombre'] = 'Escribe el nombre.'
  } else if (nombre.length > LARGO_MAXIMO_DE_NOMBRE_DE_VALOR) {
    errores['nombre'] = `El nombre admite hasta ${String(LARGO_MAXIMO_DE_NOMBRE_DE_VALOR)} letras.`
  }
  const textoDelOrden = b.orden.trim()
  const orden = /^\d+$/.test(textoDelOrden) ? Number(textoDelOrden) : Number.NaN
  if (!(orden >= 0 && orden <= ORDEN_MAXIMO_DE_VALOR)) {
    errores['orden'] = `El orden es un número entero de 0 a ${String(ORDEN_MAXIMO_DE_VALOR)}.`
  }
  if (Object.keys(errores).length > 0) {
    return { ok: false, errores }
  }
  return { ok: true, datos: { nombre, activo: b.activo, orden } }
}

/** Sólo lo que cambió respecto de lo guardado; nulo si no hay nada que guardar. */
export function cambiosDeValor(
  original: ValorDeCatalogo,
  nuevo: DatosDeValor,
): Partial<DatosDeValor> | null {
  const cambios: Partial<DatosDeValor> = {}
  if (nuevo.nombre !== original.nombre) cambios.nombre = nuevo.nombre
  if (nuevo.activo !== original.activo) cambios.activo = nuevo.activo
  if (nuevo.orden !== original.orden) cambios.orden = nuevo.orden
  return Object.keys(cambios).length === 0 ? null : cambios
}
