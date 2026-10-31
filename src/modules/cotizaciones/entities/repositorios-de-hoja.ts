import type { Resultado } from '@/shared/lib/errores'
import type { ResultadoDeCrear } from './guardado'
import type { HojaParaCotizar } from './hoja'
import type { PedidoDeGuardado } from './pedido-de-guardado'
import type { PedidoDeRecalculo } from './pedido-de-recalculo'
import type { RespuestaDeRecalculo } from './recalculo'
import type { PedidoDeTabla, TablaDeAyuda } from './tabla-de-ayuda'

// La hoja de cotizar de un origen (`cotizacion_hoja()`, paso 4.13): una sola lectura al abrirla, con el diseño recortado al nivel de quien mira, la versión de la fórmula y la
// hora de la base, la hoja abierta que las firma (para `cotizacion_evaluar` y `cotizacion_crear`, D2) o «sin publicar». Pide `cotizaciones.crear` y `cotizaciones.ver` del origen.
export type LectorDeHoja = (origenId: string) => Promise<Resultado<HojaParaCotizar>>

// El recálculo de la hoja desde el navegador (`cotizacion_evaluar()`, con la sesión y la RLS de quien cotiza).
export type Recalculador = (pedido: PedidoDeRecalculo) => Promise<Resultado<RespuestaDeRecalculo>>

// La tabla de referencia que abre la ayuda de una celda (`cotizacion_tabla()` con la hoja abierta, paso 4.13-4c2), leída desde el navegador al abrir el panel.
export type LectorDeTablaDeAyuda = (pedido: PedidoDeTabla) => Promise<Resultado<TablaDeAyuda>>

// El primer recálculo, que hace el servidor junto con la lectura de la hoja. Un vehículo que la base no deja usar (no se ve, o es de otro origen) se suelta y se
// calcula sin él: `vehiculoSoltado` lo dice.
export type RecalculadorAlAbrir = (pedido: {
  origenId: string
  vehiculoId: string | null
  abierta: string
  // El modo con que abre la hoja (P1): el primer cálculo ya lo lleva.
  modoTc: string | null
}) => Promise<{
  resultado: Resultado<RespuestaDeRecalculo>
  vehiculoSoltado: boolean
}>

// El guardado de la hoja (`cotizacion_crear()`, con la sesión y la RLS de quien cotiza): lo guardado, la respuesta perdida o el rechazo con su motivo. Nunca lanza.
export type CreadorDeCotizacion = (pedido: PedidoDeGuardado) => Promise<ResultadoDeCrear>
