// Escribir las notas de una unidad, dicho como interfaz (6.04-2). La implementación (Supabase, bajo la RLS de quien escribe) vive en `infra/mover/notas.ts`; la entrega `areas/mover/composicion.ts`.
// No hay «borrar»: la policy de lectura de `notas` rechaza el borrado suave por `update` (abierto 6-3).
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'

export type NotaGuardada = { id: string; actualizadoEn: string }

export type RepositorioDeNotas = {
  // El autor es quien pide: lo pone el servidor, nunca el cliente.
  crear: (pedido: {
    vehiculoId: string
    cuerpo: string
    autorId: string
  }) => Promise<ResultadoDeAccion<NotaGuardada>>
  // Sólo la propia y que no sea de un cambio de fase; si no toca ninguna fila, «ya no está».
  editar: (pedido: {
    id: string
    cuerpo: string
    autorId: string
  }) => Promise<ResultadoDeAccion<NotaGuardada>>
}
