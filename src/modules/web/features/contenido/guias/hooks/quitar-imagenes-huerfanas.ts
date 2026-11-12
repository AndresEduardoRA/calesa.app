import { quitarSiHuerfano } from '@/shared/lib/supabase/almacen.client'

// Las imágenes y la portada que dejaron de estar en la guía: se quitan del bucket `web` sólo si ninguna fila las usa (`storage_refcount` ya
// cuenta el cuerpo y la portada de todas las guías). Se llama después de que la base guardó o eliminó. Una subida que nunca se guardó queda
// huérfana: deuda aceptada (D11 del 8.03-1).
export function quitarImagenesHuerfanas(
  antes: readonly string[],
  despues: readonly string[],
): void {
  for (const ruta of antes) {
    if (!despues.includes(ruta)) {
      void quitarSiHuerfano('web', ruta)
    }
  }
}
