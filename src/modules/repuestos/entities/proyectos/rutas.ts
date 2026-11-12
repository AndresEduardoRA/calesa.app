import { RUTAS } from '@/shared/lib/rutas'

/** La pantalla de un proyecto: `/repuestos/<id>` (la dibuja la parte 2 del 8.09). */
export function rutaDelProyecto(id: string): string {
  return `${RUTAS.repuestos}/${id}`
}
