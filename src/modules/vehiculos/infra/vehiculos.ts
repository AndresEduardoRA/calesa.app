import 'server-only'
import { z } from 'zod'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { Json } from '@/shared/types/database.types'
import { PREFIJO_DE_ATRIBUTO } from '../entities/campo'
import type { ClaveComun } from '../entities/comunes'
import type { DatosDeVehiculo } from '../entities/esquema'
import type { FalloAlGuardar, RepositorioVehiculos } from '../entities/repositorios'

// La ficha de un vehículo se escribe sólo por RPC (`…000200_vehiculos_escritura.sql`): la tabla
// es de sólo lectura. Un nulo en `p_datos` vacía el dato; una clave ausente no se toca.

// Cómo se llama en la base cada dato común.
const COLUMNA: Record<ClaveComun, string> = {
  titulo: 'titulo',
  marca: 'marca',
  modelo: 'modelo',
  anio: 'anio',
  vin: 'vin',
  categoriaId: 'categoria_id',
  kilometraje: 'kilometraje',
  placado: 'placado',
  lote: 'lote',
  plataforma: 'plataforma',
  urlOrigen: 'url_origen',
  precio: 'precio',
  precioNegociable: 'precio_negociable',
  aceptaPermuta: 'acepta_permuta',
}

function comoColumnas(datos: DatosDeVehiculo): Record<string, Json> {
  const columnas: Record<string, Json> = { atributos: datos.atributos }
  for (const [clave, valor] of Object.entries(datos.comunes)) {
    columnas[COLUMNA[clave as ClaveComun]] = valor
  }
  return columnas
}

// La base dice en `hint` qué dato frenó el guardado (`anio`, `atributos.color`): acá se traduce a
// la clave de ese campo en el formulario.
function campoDe(hint: string | null | undefined): string | undefined {
  if (!hint) {
    return undefined
  }
  if (hint.startsWith('atributos.')) {
    return PREFIJO_DE_ATRIBUTO + hint.slice('atributos.'.length)
  }
  return Object.entries(COLUMNA).find(([, columna]) => columna === hint)?.[0]
}

type ErrorDeRpc = { code?: string | null; message: string; hint?: string | null }

function fallo(error: ErrorDeRpc): FalloAlGuardar {
  const campo = campoDe(error.hint)
  return { ok: false, error: errorDePostgrest(error), ...(campo ? { campo } : {}) }
}

const creado = z.object({ id: z.guid(), numero: z.number(), actualizado_en: z.string() })
const guardado = z.object({ actualizado_en: z.string() })

const crear: RepositorioVehiculos['crear'] = async ({ id, origenId, datos, consulta }) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('vehiculo_crear', {
    p_id: id,
    p_origen: origenId,
    p_datos: comoColumnas(datos),
    // Sin consulta a apibara el parámetro no viaja: la RPC lo tiene por defecto en nulo.
    ...(consulta ? { p_consulta: consulta } : {}),
  })
  if (error) {
    return fallo(error)
  }
  const fila = creado.parse(data)
  return {
    ok: true,
    data: { id: fila.id, numero: fila.numero, actualizadoEn: fila.actualizado_en },
  }
}

const guardar: RepositorioVehiculos['guardar'] = async ({ id, actualizadoEnEsperado, datos }) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('vehiculo_guardar', {
    p_vehiculo: id,
    p_actualizado_en_esperado: actualizadoEnEsperado,
    p_datos: comoColumnas(datos),
  })
  if (error) {
    return fallo(error)
  }
  return { ok: true, data: { actualizadoEn: guardado.parse(data).actualizado_en } }
}

const refrescado = z.object({
  actualizado_en: z.string(),
  estado_subasta: z.string().nullable(),
  subasta_en: z.string().nullable(),
})

const refrescarSubasta: RepositorioVehiculos['refrescarSubasta'] = async ({
  id,
  actualizadoEnEsperado,
  consulta,
  columnas,
  atributos,
}) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('vehiculo_subasta_refrescar', {
    p_vehiculo: id,
    p_actualizado_en_esperado: actualizadoEnEsperado,
    p_consulta: consulta,
    // Las claves son las columnas de la base; los atributos sólo viajan si hay alguno.
    p_datos: {
      ...columnas,
      ...(Object.keys(atributos).length > 0 ? { atributos } : {}),
    } as Json,
  })
  if (error) {
    return fallo(error)
  }
  const fila = refrescado.parse(data)
  return {
    ok: true,
    data: {
      actualizadoEn: fila.actualizado_en,
      estado: fila.estado_subasta,
      subastaEn: fila.subasta_en,
    },
  }
}

const repetido = z.array(
  z.object({ posicion: z.number().int(), vehiculo_id: z.guid().nullable(), visible: z.boolean() }),
)

const repetidos: RepositorioVehiculos['repetidos'] = async ({ origenId, claves }) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('vehiculos_repetidos', {
    p_origen: origenId,
    p_claves: claves.map((clave) => ({ ...clave })),
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(
    repetido.parse(data).map((fila) => ({
      // La RPC cuenta desde 1.
      posicion: fila.posicion - 1,
      vehiculoId: fila.visible ? fila.vehiculo_id : null,
    })),
  )
}

export const vehiculosSupabase: RepositorioVehiculos = {
  crear,
  guardar,
  repetidos,
  refrescarSubasta,
}
