import 'server-only'
import { z } from 'zod'
import { MAXIMO_DE_PAGINA_DE_COTIZACIONES } from '../../entities/listado/listado'
import type { FilaDelListado, PedidoDelListado } from '../../entities/listado/listado'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { armarPagina, type Pagina } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/server'

// Una página del listado `/cotizaciones` (4.16-1): UNA llamada a `cotizaciones_listado()`, que corre como quien mira (la RLS decide) y lee cada ruta por su
// índice (`cotizaciones_listado_idx`, `_finales_idx`, `_origen_creado_idx`, `_origen_finales_idx`, `_creador_idx`, `_lead_creado_idx` y `_vehiculo_creado_idx`; con 250.000 en
// `supabase/tests/medir-cotizaciones-listado.sql`). Pide `tamano + 1` (la base suma la de más) y `armarPagina` dice si hay otra hacia cada lado.
const esquemaDelPedido = z.object({
  origenId: z.guid().optional(),
  clase: z.enum(['preventa', 'final']).optional(),
  mias: z.boolean().optional(),
  vehiculoId: z.guid().optional(),
  cursor: z
    .object({
      instante: z.string().min(1),
      id: z.guid(),
      sentido: z.enum(['siguiente', 'anterior']),
    })
    .nullable(),
  tamano: z.int().min(1).max(MAXIMO_DE_PAGINA_DE_COTIZACIONES),
})

const esquemaDeFila = z.object({
  id: z.guid(),
  numero: z.number(),
  origen_id: z.guid(),
  lead_id: z.guid().nullable(),
  vehiculo_id: z.guid().nullable(),
  creado_por: z.guid(),
  clase: z.enum(['preventa', 'final']),
  estado: z.enum(['activa', 'reportada', 'invalida']),
  titulo: z.string().nullable(),
  total_base: z.number(),
  moneda_mostrar: z.string().nullable(),
  creado_en: z.string(),
  vence_el: z.string(),
  vencida: z.boolean(),
})

function filaDesde(f: z.infer<typeof esquemaDeFila>): FilaDelListado {
  return {
    id: f.id,
    numero: f.numero,
    origenId: f.origen_id,
    leadId: f.lead_id,
    vehiculoId: f.vehiculo_id,
    creadoPor: f.creado_por,
    clase: f.clase,
    estado: f.estado,
    titulo: f.titulo,
    totalBase: f.total_base,
    monedaMostrar: f.moneda_mostrar,
    creadoEn: f.creado_en,
    venceEl: f.vence_el,
    vencida: f.vencida,
  }
}

// Los filtros y el cursor de la RPC: un filtro vacío no se manda (la base lo toma nulo); el instante del cursor va tal como lo
// devolvió la base (por `Date` perdería los microsegundos).
function filtrosDe({
  origenId,
  clase,
  mias,
  vehiculoId,
  cursor,
}: z.infer<typeof esquemaDelPedido>) {
  return {
    p_origen: origenId ?? undefined,
    p_clase: clase ?? undefined,
    p_mias: mias ?? false,
    p_vehiculo: vehiculoId ?? undefined,
    p_cursor_en: cursor?.instante ?? undefined,
    p_cursor_id: cursor?.id ?? undefined,
    p_hacia_atras: cursor?.sentido === 'anterior',
  }
}

export async function getListadoDeCotizaciones(
  pedido: PedidoDelListado,
): Promise<Resultado<Pagina<FilaDelListado>>> {
  const valido = esquemaDelPedido.safeParse(pedido)
  if (!valido.success) {
    return fallo('validacion', 'Ese filtro del listado no es válido.')
  }
  const supabase = await createClient()
  // El tamaño, del pedido validado (nunca escrito a mano: `scripts/guardas/paginas.test.ts`).
  const { data, error } = await supabase.rpc('cotizaciones_listado', {
    p_tamano: valido.data.tamano,
    ...filtrosDe(valido.data),
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas = z.array(esquemaDeFila).safeParse(data)
  if (!filas.success) {
    return fallo('inesperado', 'No pudimos leer el listado. Recarga para volver a intentar.')
  }
  return ok(armarPagina(filas.data.map(filaDesde), valido.data.tamano, valido.data.cursor))
}
