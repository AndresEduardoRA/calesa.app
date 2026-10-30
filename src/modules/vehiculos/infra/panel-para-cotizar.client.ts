// Las dos listas del panel del vehículo de la hoja de cotizar, en el navegador y con la sesión de quien mira: la RLS de `vehiculos`
// decide qué llega (un «propios» ve lo suyo). Van por el navegador porque cambiar de pestaña o de página no puede pedirle la página al
// servidor: la hoja abierta se volvería a montar. Una página de `TAMANO_DE_VER_MAS` y una fila de más para saber si hay otra.
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import {
  armarPaginaPor,
  TAMANO_DE_VER_MAS,
  type Cursor,
  type Pagina,
} from '@/shared/lib/paginacion'
import {
  aplicarCursor,
  citar,
  ordenarPorCursor,
  patronContiene,
} from '@/shared/lib/supabase/consultas'
import { createClient } from '@/shared/lib/supabase/browser'
import {
  columnasDelPanel,
  instanteDelPanel,
  ORDEN_DEL_PANEL,
  vehiculosDelPanelDesde,
  type ListaDelPanel,
  type VehiculoDelPanel,
} from '../entities/panel-para-cotizar'
import { FILTRO_DE_PORTADA } from '../entities/vehiculo'

export type PedidoDelPanel = {
  origenId: string
  lista: ListaDelPanel
  // El borde de «Cierre subasta» (`desdeDelCierre()`), fijo mientras el panel está abierto.
  desde: string
  cursor: Cursor | null
  // Lo que se busca, para la lista `'busqueda'`.
  texto?: string
}

export async function leerListaDelPanel(
  pedido: PedidoDelPanel,
): Promise<Resultado<Pagina<VehiculoDelPanel>>> {
  const { origenId, lista, desde, cursor, texto } = pedido
  if (lista === 'busqueda' && !texto) {
    return fallo('inesperado', 'No hay nada que buscar.')
  }
  const orden = ORDEN_DEL_PANEL[lista]
  const base = createClient()
    .from('vehiculos')
    .select(columnasDelPanel(lista))
    .eq('origen_id', origenId)
    .eq(FILTRO_DE_PORTADA.columna, FILTRO_DE_PORTADA.valor)
  // «Últ. cotización»: `vehiculos_cotizado_idx` (origen_id, cotizado_en desc, id desc) where cotizado_en is not null. «Cierre subasta»:
  // `vehiculos_cierre_subasta_idx` (origen_id, cierre_subasta_en, id) where cierre_subasta_en is not null; el margen es otro `>=` sobre la
  // columna, que con el del cursor se combina con AND: condición de índice, no descarta filas. La búsqueda es la del inventario
  // (`condiciones.ts`): título, VIN o lote, por `vehiculos_origen_listado_idx` (origen_id, creado_en desc, id desc). Medida la forma
  // `titulo|vin` con un texto que coincide (`medir-escala.sql`, «vehículos: búsqueda»); sin medir el `lote` y el caso en que nada
  // coincide, que recorre el origen entero: los mismos límites que tiene el inventario.
  const patron = citar(patronContiene(texto ?? ''))
  const filtrada =
    lista === 'ultima'
      ? base.not('cotizado_en', 'is', null)
      : lista === 'cierre'
        ? base.gte('cierre_subasta_en', desde)
        : base.or(`titulo.ilike.${patron},vin.ilike.${patron},lote.ilike.${patron}`)
  const { data, error } = await ordenarPorCursor(
    aplicarCursor(filtrada, cursor, orden),
    cursor,
    orden,
  ).limit(TAMANO_DE_VER_MAS + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const vehiculos = vehiculosDelPanelDesde(data, lista)
  if (vehiculos === null) {
    return fallo('inesperado', 'No se pudieron cargar los vehículos.')
  }
  return ok(
    armarPaginaPor(
      vehiculos,
      TAMANO_DE_VER_MAS,
      cursor,
      (vehiculo) => instanteDelPanel(lista, vehiculo) ?? '',
    ),
  )
}
