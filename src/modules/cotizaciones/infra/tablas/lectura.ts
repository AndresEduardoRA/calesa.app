// Las tablas de referencia para editarlas (4.23-2), sobre el cliente que recibe (el del servidor, con la sesión de quien configura: la policy de lectura decide qué ve).
//  - `leerTablasDeReferencia(origenId)`: las del origen y las compartidas, un pedido con tope (`tablas_referencia_origen_id_clave_key`).
//  - `leerTablaParaEditar(tablaId)`: la tabla (su versión) y después **todas** sus filas por cursor `(orden, id)` (`tablas_referencia_filas_tabla_orden_idx`). Se para sólo con
//    una página vacía o con el tope + 1: una página corta puede ser el `max_rows` del despliegue y no el final. Si alguien publica entre los pedidos, la versión leída es la
//    vieja y publicar da PT409: nunca se pisan filas nuevas. Una fila que no se lee, o más de 2.000, y la tabla no se devuelve: publicarla a medias borraría lo que faltó.
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { cortarAlTope } from '@/shared/lib/conteo'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import type { Database } from '@/shared/types/database.types'
import type { FilaEditable } from '../../entities/tablas/edicion'
import {
  esquemaDeFilaDeLaBase,
  esquemaDeTablaDeLaBase,
  FILAS_POR_PEDIDO,
  filtroDeCursor,
  marcarTapadas,
  SIN_LEER_LAS_FILAS,
  SIN_LEER_LAS_TABLAS,
  TABLA_DEMASIADO_GRANDE,
  TABLA_NO_ENCONTRADA,
  TOPE_DE_TABLAS,
  type TablaDeReferencia,
} from '../../entities/tablas/lectura'
import { columnasDesde, TOPE_DE_FILAS } from '../../entities/tablas/validacion'

type Cliente = SupabaseClient<Database>

const COLUMNAS_DE_LA_TABLA =
  'id, origen_id, clave, nombre, descripcion, columnas, version, nota, publicado_en, autor:perfiles!tablas_referencia_publicado_por_fkey(nombre)'

type TablaSinMarca = Omit<TablaDeReferencia, 'tapada'>

function deLaBase(crudo: unknown): TablaSinMarca | null {
  const leida = esquemaDeTablaDeLaBase.safeParse(crudo)
  const columnas = leida.success ? columnasDesde(leida.data.columnas) : null
  if (!leida.success || !columnas) return null
  const t = leida.data
  return {
    id: t.id,
    origenId: t.origen_id,
    clave: t.clave,
    nombre: t.nombre,
    descripcion: t.descripcion,
    columnas,
    version: t.version,
    nota: t.nota,
    publicadoEn: t.publicado_en,
    publicadoPor: t.autor?.nombre ?? null,
    compartida: t.origen_id === null,
  }
}

// Las activas del origen y las compartidas, por clave (la del origen antes que la compartida): `tablas_referencia_origen_id_clave_key`, `limit` tope + 1.
export async function leerTablasDeReferencia(
  cliente: Cliente,
  origenId: string,
): Promise<Resultado<{ tablas: TablaDeReferencia[]; hayMas: boolean }>> {
  // El origen va dentro del filtro `or`: sólo un guid.
  if (!z.guid().safeParse(origenId).success) return fallo('validacion', 'El origen no es válido.')
  const { data, error } = await cliente
    .from('tablas_referencia')
    .select(COLUMNAS_DE_LA_TABLA)
    .eq('activa', true)
    .or(`origen_id.eq.${origenId},origen_id.is.null`)
    .order('clave')
    .order('origen_id', { nullsFirst: false })
    .limit(TOPE_DE_TABLAS + 1)
  if (error) return { ok: false, error: errorDePostgrest(error) }
  const tablas: TablaSinMarca[] = []
  for (const crudo of data) {
    const tabla = deLaBase(crudo)
    if (!tabla) return fallo('inesperado', SIN_LEER_LAS_TABLAS)
    tablas.push(tabla)
  }
  const { filas, hayMas } = cortarAlTope(tablas, TOPE_DE_TABLAS)
  return ok({ tablas: marcarTapadas(filas), hayMas })
}

// Una página de filas activas en `(orden, id)` desde la última leída (sin cursor, la primera): `tablas_referencia_filas_tabla_orden_idx (tabla_id, orden, id)`.
function paginaDeFilas(
  cliente: Cliente,
  tablaId: string,
  ultima: { orden: number; id: string } | null,
  cuantas: number,
) {
  const base = cliente
    .from('tablas_referencia_filas')
    .select('id, orden, valores')
    .eq('tabla_id', tablaId)
    .eq('activa', true)
  const desde = ultima ? base.or(filtroDeCursor(ultima)) : base
  return desde.order('orden').order('id').limit(cuantas)
}

// Todas las filas, hasta una página vacía o el tope + 1; nulo si una no se lee.
async function leerTodasLasFilas(
  cliente: Cliente,
  tablaId: string,
): Promise<Resultado<z.infer<typeof esquemaDeFilaDeLaBase>[]>> {
  const filas: z.infer<typeof esquemaDeFilaDeLaBase>[] = []
  for (;;) {
    const faltan = TOPE_DE_FILAS + 1 - filas.length
    const ultima = filas.at(-1) ?? null
    const { data, error } = await paginaDeFilas(
      cliente,
      tablaId,
      ultima,
      Math.min(FILAS_POR_PEDIDO, faltan),
    )
    if (error) return { ok: false, error: errorDePostgrest(error) }
    const pagina = z.array(esquemaDeFilaDeLaBase).safeParse(data)
    if (!pagina.success) return fallo('inesperado', SIN_LEER_LAS_FILAS)
    filas.push(...pagina.data)
    if (pagina.data.length === 0 || filas.length > TOPE_DE_FILAS) return ok(filas)
  }
}

// La tabla y todas sus filas activas en su orden, o el motivo por el que no se edita.
export async function leerTablaParaEditar(
  cliente: Cliente,
  tablaId: string,
): Promise<Resultado<{ tabla: TablaDeReferencia; filas: FilaEditable[] }>> {
  const { data, error } = await cliente
    .from('tablas_referencia')
    .select(COLUMNAS_DE_LA_TABLA)
    .eq('id', tablaId)
    .eq('activa', true)
    .limit(1)
    .maybeSingle()
  if (error) return { ok: false, error: errorDePostgrest(error) }
  if (data === null) return fallo('no_encontrado', TABLA_NO_ENCONTRADA)
  const tabla = deLaBase(data)
  if (!tabla) return fallo('inesperado', SIN_LEER_LAS_TABLAS)
  const filas = await leerTodasLasFilas(cliente, tablaId)
  if (!filas.ok) return filas
  if (filas.data.length > TOPE_DE_FILAS) return fallo('regla', TABLA_DEMASIADO_GRANDE)
  return ok({
    tabla: { ...tabla, tapada: false },
    filas: filas.data.map((f) => ({ id: f.id, valores: f.valores })),
  })
}
