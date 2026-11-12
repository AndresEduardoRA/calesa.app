import { z } from 'zod'

// Una categoría de gasto (6.11-1): sale de la base (`categorias_gasto`), ningún texto fijo la nombra. `proposito` es de la lista fija de la base (tributos, flete…).
const esquemaDeCategoria = z.object({
  id: z.guid(),
  nombre: z.string(),
  proposito: z.string().nullable(),
  activo: z.boolean(),
  orden: z.number(),
})

export type CategoriaDeGasto = {
  id: string
  nombre: string
  proposito: string | null
  activo: boolean
  orden: number
}

/** Las filas de `categorias_gasto`; nulo si alguna no tiene la forma esperada. */
export function categoriasDesde(datos: unknown): CategoriaDeGasto[] | null {
  const leido = z.array(esquemaDeCategoria).safeParse(datos)
  return leido.success ? leido.data : null
}

/** Las que se ofrecen al cargar o corregir un gasto: las activas y, si se corrige uno viejo, la suya aunque se haya desactivado. */
export function categoriasParaElegir(
  categorias: readonly CategoriaDeGasto[],
  actualId: string | null,
): CategoriaDeGasto[] {
  return categorias
    .filter((c) => c.activo || c.id === actualId)
    .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'))
}

// El `check` de `categorias_gasto.proposito` en la base: una lista cerrada, no un catálogo que la empresa edite (6.11-4, D8). `tributos` es el que lee Aduana para «tributos pagados».
export const PROPOSITOS_DE_CATEGORIA = [
  { valor: 'tributos', nombre: 'Tributos' },
  { valor: 'flete', nombre: 'Flete' },
  { valor: 'grua', nombre: 'Grúa' },
  { valor: 'chaperia', nombre: 'Chapería' },
  { valor: 'despachante', nombre: 'Despachante' },
  { valor: 'otro', nombre: 'Otro' },
] as const

export const SIN_PROPOSITO = 'Sin propósito'

export function nombreDelProposito(proposito: string | null): string {
  return PROPOSITOS_DE_CATEGORIA.find((p) => p.valor === proposito)?.nombre ?? SIN_PROPOSITO
}

export const LARGO_MAXIMO_DE_NOMBRE_DE_CATEGORIA = 60
export const ORDEN_MAXIMO_DE_CATEGORIA = 32767

/** Lo que escribe la persona en el formulario, tal cual (el orden como texto y el propósito vacío = sin propósito). */
export type BorradorDeCategoria = {
  nombre: string
  proposito: string
  activo: boolean
  orden: string
}

/** Lo validado, listo para mandar. */
export type DatosDeCategoria = {
  nombre: string
  proposito: string | null
  activo: boolean
  orden: number
}

export type ValidacionDeCategoria =
  { ok: true; datos: DatosDeCategoria } | { ok: false; errores: Record<string, string> }

/** El formulario vacío de «Nueva categoría»: activa y al final de lo que tenga el orden por omisión de la base. */
export const BORRADOR_NUEVO_DE_CATEGORIA: BorradorDeCategoria = {
  nombre: '',
  proposito: '',
  activo: true,
  orden: '0',
}

export function borradorDeCategoria(c: CategoriaDeGasto): BorradorDeCategoria {
  return {
    nombre: c.nombre,
    proposito: c.proposito ?? '',
    activo: c.activo,
    orden: String(c.orden),
  }
}

/** Valida el formulario con las reglas de la base (nombre, propósito de la lista, orden `smallint`). El error de cada campo va por su clave del borrador. */
export function validarCategoria(b: BorradorDeCategoria): ValidacionDeCategoria {
  const errores: Record<string, string> = {}
  const nombre = b.nombre.trim()
  if (nombre === '') {
    errores['nombre'] = 'Escribe el nombre.'
  } else if (nombre.length > LARGO_MAXIMO_DE_NOMBRE_DE_CATEGORIA) {
    errores['nombre'] =
      `El nombre admite hasta ${String(LARGO_MAXIMO_DE_NOMBRE_DE_CATEGORIA)} letras.`
  }
  if (b.proposito !== '' && !PROPOSITOS_DE_CATEGORIA.some((p) => p.valor === b.proposito)) {
    errores['proposito'] = 'Elige uno de los propósitos de la lista.'
  }
  const textoDelOrden = b.orden.trim()
  const orden = /^\d+$/.test(textoDelOrden) ? Number(textoDelOrden) : Number.NaN
  if (!(orden >= 0 && orden <= ORDEN_MAXIMO_DE_CATEGORIA)) {
    errores['orden'] = `El orden es un número entero de 0 a ${String(ORDEN_MAXIMO_DE_CATEGORIA)}.`
  }
  if (Object.keys(errores).length > 0) {
    return { ok: false, errores }
  }
  return {
    ok: true,
    datos: { nombre, proposito: b.proposito === '' ? null : b.proposito, activo: b.activo, orden },
  }
}

/** Sólo lo que cambió respecto de lo guardado; nulo si no hay nada que guardar. */
export function cambiosDeCategoria(
  original: CategoriaDeGasto,
  nuevo: DatosDeCategoria,
): Partial<DatosDeCategoria> | null {
  const cambios: Partial<DatosDeCategoria> = {}
  if (nuevo.nombre !== original.nombre) {
    cambios.nombre = nuevo.nombre
  }
  if (nuevo.proposito !== original.proposito) {
    cambios.proposito = nuevo.proposito
  }
  if (nuevo.activo !== original.activo) {
    cambios.activo = nuevo.activo
  }
  if (nuevo.orden !== original.orden) {
    cambios.orden = nuevo.orden
  }
  return Object.keys(cambios).length === 0 ? null : cambios
}

export const SIN_PERMISO_PARA_LAS_CATEGORIAS =
  'No tienes permiso para configurar los catálogos de logística.'

/** El texto de lo que la base responde al escribir una categoría (por su código SQL); nulo si no es uno de los que se anticipan. */
export function textoDeErrorDeCategoria(codigo: string, nombre: string): string | null {
  switch (codigo) {
    case '23505':
      return `Ya hay una categoría llamada «${nombre}».`
    case '23503':
      return `«${nombre}» está en uso: tiene gastos. Desactívala para que no se ofrezca en lo nuevo.`
    case '23514':
      return 'Elige uno de los propósitos de la lista.'
    case '42501':
      return SIN_PERMISO_PARA_LAS_CATEGORIAS
    default:
      return null
  }
}
