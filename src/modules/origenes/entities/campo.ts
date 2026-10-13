// El layout de campos de un origen: qué datos tiene un vehículo de ese origen y cómo se ven. Los
// datos comunes (marca, modelo, año, VIN, lote, precio) son columnas de `vehiculos`; lo demás vive
// en `vehiculos.atributos` y se describe acá.
import { z } from 'zod'
import type { Json } from '@/shared/types/database.types'
import { claveDeNombre } from './nombre'

export const TIPOS_DE_CAMPO = [
  'texto',
  'texto_largo',
  'numero',
  'moneda',
  'booleano',
  'fecha',
  'fecha_hora',
  'opcion',
  'multi_opcion',
  'url',
  'vin',
  'lote',
] as const
export type TipoDeCampo = (typeof TIPOS_DE_CAMPO)[number]

export const ETIQUETA_DE_TIPO_DE_CAMPO: Record<TipoDeCampo, string> = {
  texto: 'Texto',
  texto_largo: 'Texto largo',
  numero: 'Número',
  moneda: 'Monto',
  booleano: 'Sí o no',
  fecha: 'Fecha',
  fecha_hora: 'Fecha y hora',
  opcion: 'Una opción',
  multi_opcion: 'Varias opciones',
  url: 'Enlace',
  vin: 'VIN',
  lote: 'Lote',
}

export function tieneOpciones(tipo: TipoDeCampo): boolean {
  return tipo === 'opcion' || tipo === 'multi_opcion'
}

// Son columnas de `vehiculos`: un campo propio con esa clave se prestaría a confusión. Espejo de
// `_origen_clave_reservada()`; la base lo vuelve a comprobar.
export const CLAVES_RESERVADAS: readonly string[] = [
  'marca',
  'modelo',
  'anio',
  'vin',
  'lote',
  'precio',
  'precio_negociable',
  'acepta_permuta',
  'placado',
  'kilometraje',
  'titulo',
  'plataforma',
  'url_origen',
  'categoria_id',
  'atributos',
]

export type OpcionDeCampo = { clave: string; etiqueta: string }

export type CampoDeLayout = {
  id: string
  origenId: string
  clave: string
  etiqueta: string
  tipo: TipoDeCampo
  opciones: OpcionDeCampo[]
  requerido: boolean
  grupo: string | null
  orden: number
  enTarjeta: boolean
  filtrable: boolean
  publicoWeb: boolean
  claveApibara: string | null
  // Viene de la preconfiguración: no se elimina ni cambia de tipo.
  esSistema: boolean
  activo: boolean
  actualizadoEn: string
}

const esquemaOpciones = z.array(z.object({ clave: z.string(), etiqueta: z.string() })).catch([])

const esquemaCampos = z.array(
  z.object({
    id: z.guid(),
    origen_id: z.guid(),
    clave: z.string(),
    etiqueta: z.string(),
    tipo: z.enum(TIPOS_DE_CAMPO),
    opciones: esquemaOpciones,
    requerido: z.boolean(),
    grupo: z.string().nullable(),
    orden: z.number(),
    en_tarjeta: z.boolean(),
    filtrable: z.boolean(),
    publico_web: z.boolean(),
    clave_apibara: z.string().nullable(),
    es_sistema: z.boolean(),
    activo: z.boolean(),
    actualizado_en: z.string(),
  }),
)

// En el orden del layout: `orden`, y a igualdad la clave (como la base).
export function camposDesde(filas: unknown): CampoDeLayout[] {
  return esquemaCampos
    .parse(filas)
    .map((fila) => ({
      id: fila.id,
      origenId: fila.origen_id,
      clave: fila.clave,
      etiqueta: fila.etiqueta,
      tipo: fila.tipo,
      opciones: fila.opciones,
      requerido: fila.requerido,
      grupo: fila.grupo,
      orden: fila.orden,
      enTarjeta: fila.en_tarjeta,
      filtrable: fila.filtrable,
      publicoWeb: fila.publico_web,
      claveApibara: fila.clave_apibara,
      esSistema: fila.es_sistema,
      activo: fila.activo,
      actualizadoEn: fila.actualizado_en,
    }))
    .sort((a, b) => a.orden - b.orden || a.clave.localeCompare(b.clave))
}

export type GrupoDeCampos = {
  // null = los que no tienen grupo.
  nombre: string | null
  campos: CampoDeLayout[]
}

// Los campos activos agrupados como los muestra el formulario: los grupos en el orden en que
// aparece su primer campo, y «sin grupo» al final.
export function agruparCampos(campos: readonly CampoDeLayout[]): GrupoDeCampos[] {
  const grupos = new Map<string | null, CampoDeLayout[]>()
  for (const campo of campos) {
    if (!campo.activo) {
      continue
    }
    grupos.set(campo.grupo, [...(grupos.get(campo.grupo) ?? []), campo])
  }
  const conNombre = [...grupos].filter(([nombre]) => nombre !== null)
  const sinGrupo = grupos.get(null)
  return [
    ...conNombre.map(([nombre, delGrupo]) => ({ nombre, campos: delGrupo })),
    ...(sinGrupo ? [{ nombre: null, campos: sinGrupo }] : []),
  ]
}

export function nombresDeGrupo(campos: readonly CampoDeLayout[]): string[] {
  return agruparCampos(campos).flatMap((grupo) => (grupo.nombre === null ? [] : [grupo.nombre]))
}

export type Sentido = 'subir' | 'bajar'

// A dónde mandar un campo cuando se sube o se baja un lugar dentro de su grupo: «después de X»
// (null = primero de todo), que es lo que entiende `origen_campo_mover()`. Devuelve null en los
// extremos del grupo. `todos` incluye los desactivados: la base ordena el origen entero.
export function destinoDeMovimiento(
  todos: readonly CampoDeLayout[],
  id: string,
  sentido: Sentido,
): { despuesDe: string | null } | null {
  const campo = todos.find((otro) => otro.id === id)
  if (!campo) {
    return null
  }
  const delGrupo = todos.filter((otro) => otro.activo && otro.grupo === campo.grupo)
  const posicion = delGrupo.findIndex((otro) => otro.id === id)
  if (sentido === 'bajar') {
    const siguiente = delGrupo[posicion + 1]
    return siguiente ? { despuesDe: siguiente.id } : null
  }
  const anterior = delGrupo[posicion - 1]
  if (!anterior) {
    return null
  }
  // Antes del anterior = después de quien está justo antes del anterior en el orden entero.
  const indice = todos.findIndex((otro) => otro.id === anterior.id)
  return { despuesDe: todos[indice - 1]?.id ?? null }
}

// La clave de un campo nuevo sale de su etiqueta; si choca con una columna de `vehiculos` o con
// otro campo del origen se le agrega un sufijo.
export function claveDeCampo(etiqueta: string, existentes: readonly string[]): string {
  const base = claveDeNombre(etiqueta, 36)
  const tomadas = new Set([...existentes, ...CLAVES_RESERVADAS])
  if (!tomadas.has(base)) {
    return base
  }
  for (let n = 2; n < 100; n += 1) {
    const candidata = `${base}_${n}`
    if (!tomadas.has(candidata)) {
      return candidata
    }
  }
  return `${base}_${Date.now() % 100000}`
}

export type CambiosDeCampo = Partial<{
  etiqueta: string
  tipo: TipoDeCampo
  opciones: OpcionDeCampo[]
  requerido: boolean
  grupo: string | null
  enTarjeta: boolean
  filtrable: boolean
  publicoWeb: boolean
  claveApibara: string | null
  activo: boolean
}>

// Lo que viaja a `origen_campo_guardar()` (columnas de la base). Un valor `undefined` no viaja:
// la base no lo toca; un `null` explícito vacía la columna.
export function cambiosComoColumnas(cambios: CambiosDeCampo): Record<string, Json> {
  const columnas: Record<string, Json> = {}
  if (cambios.etiqueta !== undefined) columnas['etiqueta'] = cambios.etiqueta
  if (cambios.tipo !== undefined) columnas['tipo'] = cambios.tipo
  if (cambios.opciones !== undefined) {
    columnas['opciones'] = cambios.opciones.map(({ clave, etiqueta }) => ({ clave, etiqueta }))
  }
  if (cambios.requerido !== undefined) columnas['requerido'] = cambios.requerido
  if (cambios.grupo !== undefined) columnas['grupo'] = cambios.grupo
  if (cambios.enTarjeta !== undefined) columnas['en_tarjeta'] = cambios.enTarjeta
  if (cambios.filtrable !== undefined) columnas['filtrable'] = cambios.filtrable
  if (cambios.publicoWeb !== undefined) columnas['publico_web'] = cambios.publicoWeb
  if (cambios.claveApibara !== undefined) columnas['clave_apibara'] = cambios.claveApibara
  if (cambios.activo !== undefined) columnas['activo'] = cambios.activo
  return columnas
}

function mismasOpciones(a: readonly OpcionDeCampo[], b: readonly OpcionDeCampo[]): boolean {
  return (
    a.length === b.length &&
    a.every((opcion, i) => {
      const otra = b[i]
      return otra !== undefined && opcion.clave === otra.clave && opcion.etiqueta === otra.etiqueta
    })
  )
}

// Sólo lo que la persona cambió respecto de lo guardado: así una edición no pisa lo que otra
// persona tocó en el mismo campo mientras tanto.
export function cambiosRespectoDe(
  campo: CampoDeLayout,
  formulario: Required<CambiosDeCampo>,
): CambiosDeCampo {
  const cambios: CambiosDeCampo = {}
  if (formulario.etiqueta !== campo.etiqueta) cambios.etiqueta = formulario.etiqueta
  if (formulario.tipo !== campo.tipo) cambios.tipo = formulario.tipo
  if (!mismasOpciones(formulario.opciones, campo.opciones)) cambios.opciones = formulario.opciones
  if (formulario.requerido !== campo.requerido) cambios.requerido = formulario.requerido
  if (formulario.grupo !== campo.grupo) cambios.grupo = formulario.grupo
  if (formulario.enTarjeta !== campo.enTarjeta) cambios.enTarjeta = formulario.enTarjeta
  if (formulario.filtrable !== campo.filtrable) cambios.filtrable = formulario.filtrable
  if (formulario.publicoWeb !== campo.publicoWeb) cambios.publicoWeb = formulario.publicoWeb
  if (formulario.claveApibara !== campo.claveApibara) cambios.claveApibara = formulario.claveApibara
  if (formulario.activo !== campo.activo) cambios.activo = formulario.activo
  return cambios
}

// Las claves de las opciones que el cambio saca.
export function opcionesQuitadas(campo: CampoDeLayout, cambios: CambiosDeCampo): OpcionDeCampo[] {
  if (!cambios.opciones) {
    return []
  }
  const quedan = new Set(cambios.opciones.map((opcion) => opcion.clave))
  return campo.opciones.filter((opcion) => !quedan.has(opcion.clave))
}

// ¿Hace falta contar vehículos antes de guardar? Cambiar el tipo, volver requerido o sacar una
// opción pueden tocar datos que ya existen. Desactivar no: el dato se conserva y se deshace.
export function necesitaVistaPrevia(campo: CampoDeLayout, cambios: CambiosDeCampo): boolean {
  if (cambios.tipo !== undefined && cambios.tipo !== campo.tipo) {
    return true
  }
  if (cambios.requerido === true && !campo.requerido) {
    return true
  }
  return opcionesQuitadas(campo, cambios).length > 0
}
