// Publicar una configuración y guardar tramos y cajas del cotizador (8.12-2, C5–C7) y crear una cotización (8.12-3, C5), dicho como interfaz. La implementación (Supabase, escritura
// directa bajo la RLS de `repuestos.configurar`, D28) vive en `infra/cotizador/escribir-configuracion.ts`; la de crear (por RPC), en
// `infra/cotizador/crear-cotizacion.ts`. Las entrega `areas/cotizador/composicion.ts`.
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { DatosDeTramo } from './configuracion'
import type {
  CajaConfigurada,
  ConfiguracionDelCotizador,
  TramoConfigurado,
} from './filas-de-configuracion'

export type PedidoDePublicar = {
  factorImportado: string
  /** La fracción (`'0.1000'`), no el %. */
  recargoLocal: string
  redondeo: string
  /** El id de la vigente que vio la persona (nulo si no había): si ya no es la última, `conflicto` (D23). */
  vigenteEsperada: number | null
  creadoPor: string
}

/** `id` nulo crea; si no, edita (la moneda no cambia al editar, D24). */
export type PedidoDeTramo = DatosDeTramo & { id: string | null; moneda: string; activo: boolean }
export type PedidoDeCaja = { id: string | null; moneda: string; monto: string; activa: boolean }

export type RepositorioDeConfiguracion = {
  publicar: (pedido: PedidoDePublicar) => Promise<ResultadoDeAccion<ConfiguracionDelCotizador>>
  guardarTramo: (pedido: PedidoDeTramo) => Promise<ResultadoDeAccion<TramoConfigurado>>
  guardarCaja: (pedido: PedidoDeCaja) => Promise<ResultadoDeAccion<CajaConfigurada>>
}

/** El id lo trae el cliente: la RPC es idempotente por id, así un reintento no duplica (D32). */
export type PedidoDeCrearCotizacion = { id: string; proyectoId: string; moneda: string }
export type CotizacionCreada = { id: string; numero: number }

export type RepositorioDeCotizaciones = {
  crear: (pedido: PedidoDeCrearCotizacion) => Promise<ResultadoDeAccion<CotizacionCreada>>
}
