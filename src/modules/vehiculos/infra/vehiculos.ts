import 'server-only'
import { z } from 'zod'
import { errorDePostgrest } from '@/shared/lib/errores'
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

const crear: RepositorioVehiculos['crear'] = async ({ id, origenId, datos }) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('vehiculo_crear', {
    p_id: id,
    p_origen: origenId,
    p_datos: comoColumnas(datos),
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

export const vehiculosSupabase: RepositorioVehiculos = { crear, guardar }
