// La lista «Importaciones» y su avance desde el navegador (9.06-5, D51 y D55), con la sesión de quien mira: la policy «importaciones: leer»
// da las propias, o todas con `datos.importar.todo`. `todas` sólo elige el filtro: sin el permiso la policy no devuelve lo ajeno.
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { codificarCursor, leerCursor, POR_ALTA, TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/browser'
import { aplicarCursor, ordenarPorCursor } from '@/shared/lib/supabase/consultas'
import {
  resumenesDesde,
  SELECCION_DE_IMPORTACION,
  type ResumenDeImportacion,
} from '../entities/resumen-de-importacion'

export const NO_SE_LEYO_LA_LISTA = 'No se pudo cargar las importaciones.'
export const NO_SE_LEYO_EL_AVANCE = 'No se pudo leer el avance. Se vuelve a intentar.'
export const SIN_CONEXION_EN_EL_AVANCE = 'Sin conexión: el avance se actualiza al volver.'

function mensajeDeFallo(conRed: string): string {
  return window.navigator.onLine ? conRed : SIN_CONEXION_EN_EL_AVANCE
}

export type PaginaDeImportaciones = { filas: ResumenDeImportacion[]; siguiente: string | null }

// Con `usuario_id` va por `importaciones_lista_propia_idx`; sin él, por `importaciones_lista_idx`. Los dos son parciales en
// `archivo_ruta is not null` (sólo las totales: las de `/leads` tienen su panel), y por eso el filtro va siempre. `limit 21`.
export async function leerImportaciones(pedido: {
  yo: string
  todas: boolean
  cursor: string | null
}): Promise<Resultado<PaginaDeImportaciones>> {
  const cursor = leerCursor(pedido.cursor)
  let consulta = createClient()
    .from('importaciones')
    .select(SELECCION_DE_IMPORTACION)
    .not('archivo_ruta', 'is', null)
  if (!pedido.todas) {
    consulta = consulta.eq('usuario_id', pedido.yo)
  }
  consulta = ordenarPorCursor(aplicarCursor(consulta, cursor, POR_ALTA), cursor, POR_ALTA)
  const { data, error } = await consulta.limit(TAMANO_DE_VER_MAS + 1)
  if (error) {
    console.error('datos: no se pudo leer la lista de importaciones')
    return {
      ok: false,
      error: { ...errorDePostgrest(error), mensaje: mensajeDeFallo(NO_SE_LEYO_LA_LISTA) },
    }
  }
  const leidas = resumenesDesde(data)
  if (leidas === null) {
    return fallo('inesperado', NO_SE_LEYO_LA_LISTA)
  }
  const filas = leidas.slice(0, TAMANO_DE_VER_MAS)
  const ultima = filas.at(-1)
  return ok({
    filas,
    siguiente:
      leidas.length > TAMANO_DE_VER_MAS && ultima
        ? codificarCursor({ instante: ultima.creadoEn, id: ultima.id, sentido: 'siguiente' })
        : null,
  })
}

// El avance de las que se siguen, por la PK (`ids` ya viene con tope: `idsParaSondear`).
export async function leerAvances(
  ids: readonly string[],
): Promise<Resultado<ResumenDeImportacion[]>> {
  if (ids.length === 0) {
    return ok([])
  }
  const { data, error } = await createClient()
    .from('importaciones')
    .select(SELECCION_DE_IMPORTACION)
    .in('id', [...ids])
    .limit(ids.length)
  if (error) {
    console.error('datos: no se pudo leer el avance de las importaciones')
    return fallo('inesperado', mensajeDeFallo(NO_SE_LEYO_EL_AVANCE))
  }
  const leidas = resumenesDesde(data)
  return leidas === null ? fallo('inesperado', NO_SE_LEYO_EL_AVANCE) : ok(leidas)
}
