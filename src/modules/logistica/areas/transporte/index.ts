// La API de servidor de el área `transporte` de `logistica` (6.08-3): las lecturas de `/logistica/embarques` (lista, grupo y catálogos), el pedido y las claves de URL. Sale por el `index.ts` de la raíz.
export { leerGrupo, leerGrupos } from '../../infra/transporte/grupos'
export {
  leerCatalogosDeTransporte,
  type CatalogosDeTransporte,
} from '../../infra/transporte/lectura-de-catalogos'
export {
  esquemaDeFiltrosDeGrupos,
  gruposFiltrados,
  pedidoDeGrupos,
  type PedidoDeGrupos,
} from '../../entities/transporte/filtros'
export {
  nombreDeCatalogo,
  textoDeUnidades,
  valorDelGrupo,
  type GrupoDeTransporte,
  type GrupoLeido,
  type PaginaDeGrupos,
  type UnidadDelGrupo,
} from '../../entities/transporte/grupos'
export {
  CLAVE_DE_GRUPO,
  PANEL_EDITAR_GRUPO,
  claveDelResumenDe,
  tipoDeGrupoDeLaVista,
  tipoDeLaBaseDe,
  vistaDeGrupos,
  type VistaDeGrupos,
} from '../../entities/transporte/paneles'
