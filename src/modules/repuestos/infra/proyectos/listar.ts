import 'server-only'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  armarPaginaDeProyectos,
  filasDeProyectoDesde,
  type PaginaDeProyectos,
  type PedidoDelListado,
} from '../../entities/proyectos/listado'

const NO_SE_LEYO = 'No se pudieron cargar los proyectos de repuestos.'

// La lista de `/repuestos` (8.09-1) se lee con `repuestos_proyectos_listar()`, con la sesión de quien mira: sin `repuestos.ver` la base devuelve cero filas. Por cursor `numero desc`
// sobre `repuestos_proyectos_numero_key`; la base suma la fila de más (`tamano + 1`) que dice si hay otra página: no se suma uno acá. Las cuentas de ítems las trae la fila (≤ 201 por
// proyecto, sin N+1). Un parámetro nulo es «no va» para la base; sus tipos generados no lo admiten.
const nuloParaLaBase = <T>(valor: T | null): T => valor as T

export async function leerProyectosDelListado(
  pedido: PedidoDelListado,
): Promise<Resultado<PaginaDeProyectos>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('repuestos_proyectos_listar', {
    p_cursor: nuloParaLaBase(pedido.cursor),
    p_tamano: pedido.tamano,
    p_q: nuloParaLaBase(pedido.q),
    p_estado: nuloParaLaBase(pedido.estado),
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas = filasDeProyectoDesde(data)
  return filas === null
    ? fallo('inesperado', NO_SE_LEYO)
    : ok(armarPaginaDeProyectos(filas, pedido.tamano))
}
