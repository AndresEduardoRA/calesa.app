// Favorita, reportar y moderar una cotización, dicho como interfaz (4.27-4). La implementación (Supabase, por RPC) vive en `infra/comentarios/marcas.ts` y se la entrega
// `areas/comentarios/composicion.ts`. La base vuelve a pedir ver, moderar, `final.gestionar` y la versión.
import type { Resultado } from '@/shared/lib/errores'
import type { EstadoDeLaCotizacion } from './moderacion'

export type RepositorioDeMarcas = {
  // `cotizacion_favorito_poner`: la respuesta dice cómo quedó.
  ponerFavorita: (pedido: {
    cotizacionId: string
    valor: boolean
  }) => Promise<Resultado<{ valor: boolean }>>
  // `cotizacion_reportar`: uno por persona; el segundo cambia el motivo.
  reportar: (pedido: {
    cotizacionId: string
    motivo: string
  }) => Promise<Resultado<{ resultado: 'reportada' | 'motivo_cambiado' | 'sin_cambios' }>>
  // `cotizacion_reporte_retirar`.
  retirarReporte: (pedido: {
    cotizacionId: string
  }) => Promise<Resultado<{ resultado: 'retirado' | 'sin_cambios' }>>
  // `cotizacion_moderar`, con la versión que vio quien modera.
  moderar: (pedido: {
    cotizacionId: string
    actualizadoEn: string
    estado: Exclude<EstadoDeLaCotizacion, 'reportada'>
  }) => Promise<Resultado<{ resultado: 'moderada' | 'sin_cambios'; estado: EstadoDeLaCotizacion }>>
}
