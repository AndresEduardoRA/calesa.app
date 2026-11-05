import 'server-only'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { armarPagina, type Pagina } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/server'
import type { BuscadorDeVehiculos } from '../../entities/repositorios'
import {
  MAXIMO_DE_PAGINA_DE_VEHICULOS,
  vehiculosDelInventario,
  type Vehiculo,
} from '../../entities/vehiculo'

// Una página del inventario por `vehiculos_inventario()` (4.16-2b, cierra 4-23): UNA llamada, que corre como quien mira (la RLS decide)
// y lee cada ruta por su índice: el origen (`vehiculos_origen_listado_idx`), lo creado por quien mira (`vehiculos_creador_idx`) y su
// cartera corta de leads (`vehiculos_lead_id_idx`); las mide `supabase/tests/medir-vehiculos-inventario.sql`. Pide `tamano`, la base
// suma la fila de más, y `armarPagina` dice si hay otra hacia cada lado.
const esquemaDelPedido = z.object({
  origenId: z.guid(),
  cursor: z
    .object({
      instante: z.string().min(1),
      id: z.guid(),
      sentido: z.enum(['siguiente', 'anterior']),
    })
    .nullable(),
  tamano: z.int().min(1).max(MAXIMO_DE_PAGINA_DE_VEHICULOS),
})

// La base rechazó los filtros (`22023`, hint `filtros`): quien llama lee esa página por la tabla, como antes del 4.16-2b.
export const FILTROS_RECHAZADOS = Symbol('filtros-rechazados')

type Pedido = Parameters<BuscadorDeVehiculos>[0]

export async function leerPorLaFuncion(
  pedido: Omit<Pedido, 'fuente'>,
): Promise<Resultado<Pagina<Vehiculo>> | typeof FILTROS_RECHAZADOS> {
  const valido = esquemaDelPedido.safeParse(pedido)
  if (!valido.success) {
    return fallo('validacion', 'Ese pedido del inventario no es válido.')
  }
  const { origenId, cursor, tamano } = valido.data
  const supabase = await createClient()
  // Las condiciones van tal cual y en su orden: las arma `condicionesDe()` desde un esquema ya validado y la base las valida enteras.
  // El tamaño, del pedido validado (nunca escrito a mano: `scripts/guardas/paginas.test.ts`); el instante, como texto (por `Date`
  // perdería los microsegundos).
  const { data, error } = await supabase.rpc('vehiculos_inventario', {
    p_origen: origenId,
    p_tamano: tamano,
    p_filtros: [...pedido.condiciones],
    p_cursor_en: cursor?.instante ?? undefined,
    p_cursor_id: cursor?.id ?? undefined,
    p_hacia_atras: cursor?.sentido === 'anterior',
  })
  if (error) {
    if (error.code === '22023' && error.hint === 'filtros') {
      return FILTROS_RECHAZADOS
    }
    return { ok: false, error: errorDePostgrest(error) }
  }
  let filas: Vehiculo[]
  try {
    filas = vehiculosDelInventario(data)
  } catch {
    return fallo('inesperado', 'No pudimos leer el inventario. Recarga para volver a intentar.')
  }
  return ok(armarPagina(filas, tamano, cursor))
}
