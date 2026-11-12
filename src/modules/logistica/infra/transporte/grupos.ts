import 'server-only'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { TAMANO_DE_PAGINA_POR_DEFECTO } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/server'
import type { PedidoDeGrupos } from '../../entities/transporte/filtros'
import {
  grupoDesde,
  paginaDeGruposDesde,
  type GrupoLeido,
  type PaginaDeGrupos,
} from '../../entities/transporte/grupos'
import type { LecturasDeGrupos } from '../../entities/transporte/repositorio-de-grupos'
import { NO_SE_LEYO, nuloParaLaBase } from './rpc'

// `/logistica/embarques` lee con `transporte_grupos()` (la lista) y `transporte_grupo()` (las unidades de un grupo), con la sesión de quien mira: la base decide qué unidades ve cada quien
// (`puede_unidad`) y devuelve sólo eso (6.07-3). Por cursor opaco = el id de una fila con la clave siguiente, de a `TAMANO_DE_PAGINA_POR_DEFECTO` grupos; la base recorre a lo sumo 2.000 filas
// por llamada y dice `cortada`. Índices: `transportes_booking_idx` y `transportes_contenedor_idx` (parciales, por la clave). Sólo RPC: ninguna lectura directa de una tabla con RLS.

function inesperado(): Resultado<never> {
  return fallo('inesperado', NO_SE_LEYO)
}

export async function leerGrupos(pedido: PedidoDeGrupos): Promise<Resultado<PaginaDeGrupos>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('transporte_grupos', {
    p_tipo: pedido.tipo,
    p_desde: nuloParaLaBase(pedido.desde),
    p_tope: TAMANO_DE_PAGINA_POR_DEFECTO,
    p_filtros: pedido.filtros,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const pagina = paginaDeGruposDesde(data)
  return pagina === null ? inesperado() : ok(pagina)
}

export async function leerGrupo(
  tipo: 'booking' | 'contenedor',
  clave: string,
): Promise<Resultado<GrupoLeido>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('transporte_grupo', { p_tipo: tipo, p_clave: clave })
  if (error) {
    // Una clave vacía (22023) se trata como inexistente: el grupo sin unidades.
    return error.code === '22023'
      ? ok({ tipo, clave, unidades: [], hayMas: false, hayOcultas: false })
      : { ok: false, error: errorDePostgrest(error) }
  }
  const grupo = grupoDesde(data)
  return grupo === null ? inesperado() : ok(grupo)
}

export const gruposSupabase: LecturasDeGrupos = { listar: leerGrupos, leer: leerGrupo }
