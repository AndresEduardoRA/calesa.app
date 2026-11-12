// La API de servidor de el área `aduana` de `logistica` (6.09): la lista de `/logistica/aduana`, su pedido y el resumen de una declaración. Sale por el `index.ts` de la raíz.
export { leerDeclaracion, leerDeclaraciones } from '../../infra/aduana/listas'
export {
  esquemaDeFiltrosDeAduana,
  pedidoDeAduana,
  type PedidoDeAduana,
} from '../../entities/aduana/filtros'
export {
  CANALES_DE_AFORO,
  textoDelCanal,
  type CanalDeAforo,
  type DeclaracionLeida,
  type FilaDeDeclaracion,
  type VehiculoDeDeclaracion,
} from '../../entities/aduana/declaracion'
export type { RepositorioDeAduana } from '../../entities/aduana/repositorio'
export { PANEL_EDITAR_DECLARACION, PANEL_NUEVA_DECLARACION } from '../../entities/aduana/paneles'
