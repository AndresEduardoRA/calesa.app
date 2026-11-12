// La API de servidor del área `dinero` de `logistica` (6.11): las listas de `/logistica/gastos`, su pedido y sus vistas. Sale por el `index.ts` de la raíz.
export {
  leerCategoriasDeGasto,
  leerGastosDelListado,
  leerPagosDelListado,
} from '../../infra/dinero/listas'
export {
  CLAVE_DE_VISTA,
  ETIQUETA_DE_VISTA,
  cursorDeFila,
  esquemaDeFiltrosDeDinero,
  pedidoDeDinero,
  rutaDeLaLista,
  vistaDe,
  vistasPermitidas,
  type FilaDeGasto,
  type FilaDePago,
  type PedidoDeDinero,
  type VistaDeDinero,
} from '../../entities/dinero/listas'
export type { CategoriaDeGasto } from '../../entities/dinero/categoria'
