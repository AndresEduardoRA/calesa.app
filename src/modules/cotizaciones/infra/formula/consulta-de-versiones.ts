// Las lecturas de la fórmula de un origen para Configuración › Cotización › «Fórmula» (4.20-2a), sobre el cliente que recibe: el del servidor (la primera página y el
// estado) y el del navegador («Ver más» e «Ir a la versión»). Corren con la sesión de quien mira: la policy `formulas: leer` deja ver sólo los orígenes donde tiene
// `cotizaciones.configurar`, y `perfiles: leer`, a todo usuario activo. Nombran sus columnas: lo oculto (`definicion`, `params`, `diseno`, `visibilidad`) no viaja.
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { autorVisible } from '../../entities/historial-del-vehiculo'
import {
  autoresDe,
  conAutores,
  conVersionDeOrigen,
  COLUMNAS_DE_VERSION,
  COLUMNAS_DEL_ESTADO,
  estadoDesde,
  versionDeOrigenPorLeer,
  paginaDeVersiones,
  versionesDesde,
  type EstadoDeLaFormula,
  type PaginaConAutores,
  type PaginaDeVersiones,
} from '../../entities/formula/versiones'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'
import type { Database } from '@/shared/types/database.types'

type Cliente = SupabaseClient<Database>

// La publicada y el borrador de un origen: a lo sumo dos filas (`formulas_publicada_unica` y `formulas_borrador_unico`, índices únicos parciales por `origen_id`).
export function consultaDelEstado(cliente: Cliente, origenId: string) {
  return cliente
    .from('formulas')
    .select(COLUMNAS_DEL_ESTADO)
    .eq('origen_id', origenId)
    .in('estado', ['borrador', 'publicada'])
    .limit(2)
}

// El número de una versión por su clave primaria (`formulas_pkey`): la de origen de un borrador atrasado.
export function consultaDeUnaVersion(cliente: Cliente, id: string) {
  return cliente.from('formulas').select('version').eq('id', id).maybeSingle()
}

// Una página de las versiones publicadas y archivadas de un origen, de la más nueva a la más vieja, y una de más para saber si hay otra. La sostiene
// `formulas_origen_id_version_key (origen_id, version)` recorrido hacia atrás; el cursor (`version < n`) es condición del índice
// (`supabase/tests/areas/formula/versiones-por-cursor.sql`).
export function consultaDeVersiones(cliente: Cliente, origenId: string, cursor: number | null) {
  const base = cliente
    .from('formulas')
    .select(COLUMNAS_DE_VERSION)
    .eq('origen_id', origenId)
    .not('version', 'is', null)
  return (cursor === null ? base : base.lt('version', cursor))
    .order('version', { ascending: false })
    .limit(TAMANO_DE_VER_MAS + 1)
}

// Los nombres de quienes nombra una página, por la clave primaria de `perfiles` (`perfiles_pkey`), una vez por página y nunca por fila.
export function consultaDeAutores(cliente: Cliente, ids: readonly string[]) {
  return cliente
    .from('perfiles')
    .select('id, nombre, email')
    .in('id', [...ids])
    .limit(ids.length)
}

const esquemaDeIds = z.array(z.guid()).max(TAMANO_DE_VER_MAS + 2)
const esquemaDeAutores = z.array(z.object({ id: z.guid(), nombre: z.string(), email: z.string() }))

export async function leerAutores(
  cliente: Cliente,
  ids: readonly string[],
): Promise<Resultado<Map<string, string>>> {
  const validos = esquemaDeIds.safeParse(ids)
  if (!validos.success) {
    return fallo('validacion', 'Esos autores no son válidos.')
  }
  if (validos.data.length === 0) {
    return ok(new Map())
  }
  const { data, error } = await consultaDeAutores(cliente, validos.data)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas = esquemaDeAutores.safeParse(data)
  if (!filas.success) {
    return fallo('inesperado', 'No se pudo cargar quién publicó las versiones.')
  }
  return ok(new Map(filas.data.map((fila) => [fila.id, autorVisible(fila)])))
}

export async function leerEstado(
  cliente: Cliente,
  origenId: string,
): Promise<Resultado<EstadoDeLaFormula>> {
  const { data, error } = await consultaDelEstado(cliente, origenId)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const estado = estadoDesde(data)
  if (!estado) {
    return fallo('inesperado', 'No se pudo cargar la fórmula.')
  }
  const porLeer = versionDeOrigenPorLeer(estado)
  if (porLeer === null) {
    return ok(estado)
  }
  const origen = await consultaDeUnaVersion(cliente, porLeer)
  if (origen.error) {
    return { ok: false, error: errorDePostgrest(origen.error) }
  }
  const version = z
    .object({ version: z.number().int().nullable() })
    .nullable()
    .safeParse(origen.data)
  return version.success
    ? ok(conVersionDeOrigen(estado, version.data?.version ?? null))
    : fallo('inesperado', 'No se pudo cargar la fórmula.')
}

// Una página sin los nombres: el servidor junta los autores de la página y del estado en una sola lectura.
export async function leerPaginaSinAutores(
  cliente: Cliente,
  origenId: string,
  cursor: number | null,
): Promise<Resultado<PaginaDeVersiones>> {
  const { data, error } = await consultaDeVersiones(cliente, origenId, cursor)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas = versionesDesde(data)
  return filas
    ? ok(paginaDeVersiones(filas))
    : fallo('inesperado', 'No se pudo cargar las versiones.')
}

// Una página con sus autores: dos lecturas, la de la página y la de sus nombres.
export async function leerPaginaConAutores(
  cliente: Cliente,
  origenId: string,
  cursor: number | null,
): Promise<Resultado<PaginaConAutores>> {
  const pagina = await leerPaginaSinAutores(cliente, origenId, cursor)
  if (!pagina.ok) {
    return pagina
  }
  const autores = await leerAutores(
    cliente,
    autoresDe(pagina.data.filas.map((fila) => fila.publicadoPor)),
  )
  return autores.ok ? ok(conAutores(pagina.data, autores.data)) : autores
}
