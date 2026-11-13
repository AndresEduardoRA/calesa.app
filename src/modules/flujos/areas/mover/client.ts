// La API de cliente del área `mover` de `flujos` (5.02, 6.01, 6.04): tipos y reglas puras de mover, y las actions que el panel de la unidad de `logistica` llama. Sale por el `client.ts` de la raíz.
export { reglaActiva } from '../../entities/mover/flujo-de-origen'
export type { FaseParaMover, FlujoDeOrigen } from '../../entities/mover/flujo-de-origen'
export {
  LARGO_MAXIMO_DE_LA_NOTA,
  MOTIVO_SIN_PERMISO_DE_MOVER,
  MOTIVO_SIN_PERMISO_DE_MOVER_UN_REPUESTO,
  TOPE_DE_DESTINOS,
  TOPE_DEL_LOTE,
} from '../../entities/mover/para-mover'
export type { DestinoConVista, DestinoDeMover, ParaMover } from '../../entities/mover/para-mover'
export {
  MOTIVO_DE_NOTA_OBLIGATORIA,
  estadoDelBoton,
  textoDelBoton,
} from '../../entities/mover/boton-de-mover'
export type { EstadoDelBoton } from '../../entities/mover/boton-de-mover'
export { motivoLegible, textoDeLoQueFalta } from '../../entities/mover/motivos'
export {
  anclaDeRequisito,
  detalleDeRequisito,
  etiquetaDeRequisito,
  faltaDeRequisito,
} from '../../entities/mover/requisitos'
export type {
  FilaDelLote,
  RequisitoVista,
  VistaPrevia,
  VistaPreviaDeUnaUnidad,
} from '../../entities/mover/vista-previa'
export { cambiarFase } from '../../features/mover/actions/cambiar-fase'
export { cambiarFaseLote } from '../../features/mover/actions/cambiar-fase-lote'
export { destinosDeLaFase } from '../../features/mover/actions/destinos-de-la-fase'
export { leerParaMover } from '../../features/mover/actions/leer-para-mover'
export { previsualizarCambio } from '../../features/mover/actions/previsualizar-cambio'
export { previsualizarCambioLote } from '../../features/mover/actions/previsualizar-cambio-lote'
