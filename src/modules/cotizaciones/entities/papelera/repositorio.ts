// Lo que la papelera de cotizaciones necesita de afuera, dicho como interfaces (4.24-2). La implementación (Supabase) vive en `infra/papelera/` y
// se la entrega `areas/papelera/composicion*.ts`.
import type { Resultado } from '@/shared/lib/errores'
import type { Cursor, Pagina } from '@/shared/lib/paginacion'
import type { LoteDeCotizaciones } from './lotes'
import type { ResultadoDeEnvio, ResultadoDePurgar, ResultadoDeRestaurar } from './resultados'

// Una página de lotes que quien llama puede ver (los suyos o, con `cotizaciones.papelera.purgar`, todos), del más nuevo al más viejo, por cursor.
export type LectorDePapeleraDeCotizaciones = (pedido: {
  cursor: Cursor | null
  tamano: number
}) => Promise<Resultado<Pagina<LoteDeCotizaciones>>>

// Un lote entero (hasta 200) para «Mostrar los N», desde el navegador. `no_encontrado` si ya no está en la papelera (se purgó o se restauró
// mientras se miraba) o no se ve.
export type LectorDeLoteDeCotizaciones = (loteId: string) => Promise<Resultado<LoteDeCotizaciones>>

export type PedidoSobreUnLote = {
  loteId: string
  actualizadoEnEsperado: string
  cotizaciones?: readonly string[] | undefined
}

// Restaurar y purgar mandan la versión del lote que estaba en pantalla; sin `cotizaciones` es el lote entero. Lo que choca al restaurar queda pendiente, y
// lo que otra tabla necesita al purgar queda bloqueado, cada una con su motivo. Purgar pide `cotizaciones.papelera.purgar` (la base lo vuelve a mirar).
// Enviar (4.24-3) manda la versión de cada cotización que estaba en pantalla: lo que la base rechaza (otra versión, sin permiso) vuelve en `rechazados`.
export type RepositorioDePapeleraDeCotizaciones = {
  enviar: (
    cotizaciones: readonly { id: string; actualizadoEn: string }[],
  ) => Promise<Resultado<ResultadoDeEnvio>>
  restaurar: (pedido: PedidoSobreUnLote) => Promise<Resultado<ResultadoDeRestaurar>>
  purgar: (pedido: PedidoSobreUnLote) => Promise<Resultado<ResultadoDePurgar>>
}
