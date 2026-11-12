import 'server-only'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { TAMANO_DE_PAGINA_POR_DEFECTO, type Pagina } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/server'
import { NO_SE_LEYO, nuloParaLaBase } from './rpc'
import {
  declaracionDesde,
  filasDeDeclaracionDesde,
  type DeclaracionLeida,
  type FilaDeDeclaracion,
} from '../../entities/aduana/declaracion'
import { paginaDeAduana, type PedidoDeAduana } from '../../entities/aduana/filtros'
import type { RepositorioDeAduana } from '../../entities/aduana/repositorio'

// La lista de `/logistica/aduana` se lee con `declaraciones_listar()` y el resumen con `declaracion_leer()`, con la sesión de quien mira: la base decide qué declaraciones ve
// (`logistica.aduana.gestionar`, o `logistica.ver` con un vehículo que ve) y de dónde sale «pagada» (6.07). Por cursor `(creado_en desc, id desc)` sobre `declaraciones_aduana_creado_idx`;
// una fila de más dice si hay otra página. Sólo RPC: ninguna lectura directa de una tabla con RLS.

const NO_ESTA = 'Esta declaración ya no existe o ya no la ves.'

function inesperado(): Resultado<never> {
  return fallo('inesperado', NO_SE_LEYO)
}

export async function leerDeclaraciones(
  pedido: PedidoDeAduana,
): Promise<Resultado<Pagina<FilaDeDeclaracion>>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('declaraciones_listar', {
    p_desde: nuloParaLaBase(pedido.cursor?.desde ?? null),
    p_id: nuloParaLaBase(pedido.cursor?.id ?? null),
    p_tope: TAMANO_DE_PAGINA_POR_DEFECTO,
    p_filtros: pedido.filtros,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas = filasDeDeclaracionDesde(data)
  return filas === null ? inesperado() : ok(paginaDeAduana(filas))
}

export async function leerDeclaracion(id: string): Promise<Resultado<DeclaracionLeida>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('declaracion_leer', { p_id: id })
  if (error) {
    // La inexistente y la que no se ve dan el mismo `P0002`.
    return error.code === 'P0002'
      ? fallo('no_encontrado', NO_ESTA)
      : { ok: false, error: errorDePostgrest(error) }
  }
  const declaracion = declaracionDesde(data)
  return declaracion === null ? inesperado() : ok(declaracion)
}

export const aduanaSupabase: RepositorioDeAduana = {
  listar: leerDeclaraciones,
  leer: leerDeclaracion,
}
