// Lo que la papelera de cotizaciones necesita de afuera, dicho como interfaces (4.24-2). La implementación (Supabase) vive en `infra/papelera/` y
// se la entrega `areas/papelera/composicion*.ts`.
import type { Resultado } from '@/shared/lib/errores'
import type { Cursor, Pagina } from '@/shared/lib/paginacion'
import type { LoteDeCotizaciones } from './lotes'
import type { ResultadoDeRestaurar } from './resultados'

// Una página de lotes que quien llama puede ver (los suyos o, con `cotizaciones.papelera.purgar`, todos), del más nuevo al más viejo, por cursor.
export type LectorDePapeleraDeCotizaciones = (pedido: {
  cursor: Cursor | null
  tamano: number
}) => Promise<Resultado<Pagina<LoteDeCotizaciones>>>

// Un lote entero (hasta 200) para «Mostrar los N», desde el navegador. `no_encontrado` si ya no está en la papelera (se purgó o se restauró
// mientras se miraba) o no se ve.
export type LectorDeLoteDeCotizaciones = (loteId: string) => Promise<Resultado<LoteDeCotizaciones>>

// Restaurar manda la versión del lote que estaba en pantalla; sin `cotizaciones` es el lote entero. Lo que choca queda pendiente, con su motivo.
export type RepositorioDePapeleraDeCotizaciones = {
  restaurar: (pedido: {
    loteId: string
    actualizadoEnEsperado: string
    cotizaciones?: readonly string[] | undefined
  }) => Promise<Resultado<ResultadoDeRestaurar>>
}
