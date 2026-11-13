// El informe por fila de una importación total (`importaciones_filas`) desde el navegador, para «Descargar las rechazadas» (9.06-5, D54).
// La policy es la de `importaciones`: las propias, o todas con `datos.importar.todo`. Sólo se lee al apretar «Descargar».
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { FILAS_POR_PEDIDO } from '../entities/exportacion'
import { filasDelInformeDesde, type FilaDelInforme } from '../entities/informe-de-importacion'

export const NO_SE_LEYO_EL_INFORME = 'No se pudo descargar las rechazadas. Prueba de nuevo.'
// 20 × 1.000 = las 20.000 filas de un archivo (D2): más no puede haber.
const PEDIDOS_DEL_INFORME = 20

// Por la PK `(importacion_id, fila)`, de a `max_rows` (1.000), siguiendo la última fila leída.
export async function leerInformeDeImportacion(id: string): Promise<Resultado<FilaDelInforme[]>> {
  const leidas: FilaDelInforme[] = []
  let ultima = 0
  for (let pedido = 0; pedido < PEDIDOS_DEL_INFORME; pedido++) {
    const { data, error } = await createClient()
      .from('importaciones_filas')
      .select('fila, resultado, campo, motivo')
      .eq('importacion_id', id)
      .gt('fila', ultima)
      .order('fila', { ascending: true })
      .limit(FILAS_POR_PEDIDO)
    if (error) {
      console.error('datos: no se pudo leer el informe de la importación')
      return fallo('inesperado', NO_SE_LEYO_EL_INFORME)
    }
    const pagina = filasDelInformeDesde(data)
    if (pagina === null) {
      return fallo('inesperado', NO_SE_LEYO_EL_INFORME)
    }
    leidas.push(...pagina)
    const fin = pagina.at(-1)
    if (pagina.length < FILAS_POR_PEDIDO || !fin) {
      break
    }
    ultima = fin.fila
  }
  return ok(leidas)
}
