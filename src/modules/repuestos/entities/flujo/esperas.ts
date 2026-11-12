// Las esperas que destraban a un vehículo (8.13-1): los ítems de repuesto que un requisito de tipo «espera» del vehículo aguarda, tal como los da
// `repuestos_pendientes_de_vehiculo` (8.08). La base devuelve una fila por pareja ítem × requisito; acá se agrupa por ítem. Puro: valida y agrupa; nunca un total.
import { z } from 'zod'
import { cortarAlTope } from '@/shared/lib/conteo'
import { fallo, MENSAJE_INESPERADO, ok, type Resultado } from '@/shared/lib/errores'

/** Lo que se pide a la base (`p_tope`, el defecto de la RPC): ella devuelve hasta una fila de más y `hayMas` lo dice. */
export const TOPE_DE_ESPERAS = 50

export type EsperaDelRequisito = {
  requisitoId: string
  faseDestinoId: string
  // Nulos si quien mira sólo ve repuestos: la base oculta los nombres de fase sin `logistica.ver` del vehículo.
  faseDestinoNombre: string | null
  esperaFaseId: string
  esperaFaseNombre: string | null
}

export type EsperaDeItem = {
  itemId: string
  descripcion: string
  proyectoId: string
  proyectoNumero: number
  faseId: string
  faseNombre: string | null
  esperas: EsperaDelRequisito[]
}

export type EsperasDelVehiculo = { items: EsperaDeItem[]; hayMas: boolean }

const esquemaDeFila = z.object({
  item_id: z.guid(),
  descripcion: z.string(),
  proyecto_id: z.guid(),
  proyecto_numero: z.number().int().min(0),
  fase_id: z.guid(),
  fase_nombre: z.string().nullable(),
  requisito_id: z.guid(),
  fase_destino_id: z.guid(),
  fase_destino_nombre: z.string().nullable(),
  espera_fase_id: z.guid(),
  espera_fase_nombre: z.string().nullable(),
})

/**
 * Las filas de la RPC (hasta `TOPE_DE_ESPERAS + 1`) como ítems con sus esperas, en el orden en que llegan (`creado_en, id`). Una fila que no cumple la forma es un error visible:
 * no se dibuja una espera a medias. Cero filas es un resultado válido (sin `repuestos.ver` ni `logistica.ver` la base devuelve nada).
 */
export function esperasDesde(filas: unknown): Resultado<EsperasDelVehiculo> {
  const leidas = z.array(esquemaDeFila).safeParse(filas)
  if (!leidas.success) return fallo('inesperado', MENSAJE_INESPERADO)
  const { filas: dentro, hayMas } = cortarAlTope(leidas.data, TOPE_DE_ESPERAS)
  const porItem = new Map<string, EsperaDeItem>()
  for (const f of dentro) {
    const espera: EsperaDelRequisito = {
      requisitoId: f.requisito_id,
      faseDestinoId: f.fase_destino_id,
      faseDestinoNombre: f.fase_destino_nombre,
      esperaFaseId: f.espera_fase_id,
      esperaFaseNombre: f.espera_fase_nombre,
    }
    const existente = porItem.get(f.item_id)
    if (existente) existente.esperas.push(espera)
    else
      porItem.set(f.item_id, {
        itemId: f.item_id,
        descripcion: f.descripcion,
        proyectoId: f.proyecto_id,
        proyectoNumero: f.proyecto_numero,
        faseId: f.fase_id,
        faseNombre: f.fase_nombre,
        esperas: [espera],
      })
  }
  return ok({ items: [...porItem.values()], hayMas })
}
