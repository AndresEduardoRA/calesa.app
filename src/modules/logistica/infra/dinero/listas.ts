import 'server-only'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { TAMANO_DE_PAGINA_POR_DEFECTO, type Pagina } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/server'
import { NO_SE_LEYO, nuloParaLaBase } from './rpc'
import { categoriasDesde, type CategoriaDeGasto } from '../../entities/dinero/categoria'
import {
  filasDeGastoDesde,
  filasDePagoDesde,
  paginaDeDinero,
  type FilaDeGasto,
  type FilaDePago,
  type PedidoDeDinero,
} from '../../entities/dinero/listas'

// Las listas de `/logistica/gastos` (6.11-3) se leen con `gastos_listar()` y `pagos_listar()`, con la sesión de quien mira: la base decide qué orígenes ve (`logistica.gastos.ver` o
// `pagos.ver` por origen) y devuelve vacía sin la clave. Por cursor `(fecha desc, id desc)`: `gastos_fecha_idx` y `pagos_fecha_idx`. Una fila de más dice si hay otra página.
// La fecha del cursor viaja como `date`: la entidad la guarda como un instante a medianoche y acá se recorta.

// Las categorías son un catálogo de decenas de filas, `using (true)` (V9 de 6.11-1): se leen todas, también las desactivadas, porque el historial las nombra.
const TOPE_DE_CATEGORIAS = 200

function inesperado(): Resultado<never> {
  return fallo('inesperado', NO_SE_LEYO)
}

export async function leerGastosDelListado(
  pedido: PedidoDeDinero,
): Promise<Resultado<Pagina<FilaDeGasto>>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('gastos_listar', {
    p_cursor_fecha: nuloParaLaBase(pedido.cursor?.fecha ?? null),
    p_cursor_id: nuloParaLaBase(pedido.cursor?.id ?? null),
    p_tope: TAMANO_DE_PAGINA_POR_DEFECTO,
    p_filtros: pedido.filtros,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas = filasDeGastoDesde(data)
  return filas === null ? inesperado() : ok(paginaDeDinero(filas))
}

export async function leerPagosDelListado(
  pedido: PedidoDeDinero,
): Promise<Resultado<Pagina<FilaDePago>>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('pagos_listar', {
    p_cursor_fecha: nuloParaLaBase(pedido.cursor?.fecha ?? null),
    p_cursor_id: nuloParaLaBase(pedido.cursor?.id ?? null),
    p_tope: TAMANO_DE_PAGINA_POR_DEFECTO,
    p_filtros: pedido.filtros,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas = filasDePagoDesde(data)
  return filas === null ? inesperado() : ok(paginaDeDinero(filas))
}

export async function leerCategoriasDeGasto(): Promise<Resultado<CategoriaDeGasto[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categorias_gasto')
    .select('id, nombre, proposito, activo, orden')
    .order('orden')
    .order('nombre')
    .limit(TOPE_DE_CATEGORIAS)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const categorias = categoriasDesde(data)
  return categorias === null ? inesperado() : ok(categorias)
}
