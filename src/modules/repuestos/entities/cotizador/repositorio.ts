// Publicar una configuración y guardar tramos y cajas del cotizador (8.12-2, C5–C7), crear una cotización (8.12-3, C5) y guardarla, aceptarla y anularla
// (8.12-4, C6), dicho como interfaz. La implementación (Supabase, escritura
// directa bajo la RLS de `repuestos.configurar`, D28) vive en `infra/cotizador/escribir-configuracion.ts`; la de crear (por RPC), en
// `infra/cotizador/crear-cotizacion.ts`, y la de guardar, aceptar y anular, en `infra/cotizador/escribir-cotizacion.ts`. Las entrega `areas/cotizador/composicion.ts`.
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { DatosDeTramo } from './configuracion'
import type { LineaParaGuardar } from './hoja-editable'
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

/** Guardar reemplaza todas las líneas (D46); la base recalcula cada total con el snapshot. `actualizadoEn` es la versión que vio la persona (PT409). */
export type PedidoDeGuardarCotizacion = {
  id: string
  lineas: readonly LineaParaGuardar[]
  notas: string | null
  actualizadoEn: string
}
export type CotizacionGuardada = { actualizadoEn: string; total: string | null }
export type PedidoDeCerrarCotizacion = { id: string; actualizadoEn: string }
export type CotizacionAceptada = { actualizadoEn: string; items: number }
export type CotizacionAnulada = { actualizadoEn: string }

export type RepositorioDeCotizaciones = {
  crear: (pedido: PedidoDeCrearCotizacion) => Promise<ResultadoDeAccion<CotizacionCreada>>
  guardar: (pedido: PedidoDeGuardarCotizacion) => Promise<ResultadoDeAccion<CotizacionGuardada>>
  aceptar: (pedido: PedidoDeCerrarCotizacion) => Promise<ResultadoDeAccion<CotizacionAceptada>>
  anular: (pedido: PedidoDeCerrarCotizacion) => Promise<ResultadoDeAccion<CotizacionAnulada>>
}
