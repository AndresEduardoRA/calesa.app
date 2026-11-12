// Composición de el área `aduana` de `logistica` en el navegador (6.09): lo que los componentes de cliente leen con la sesión de quien mira. Sólo la importa `features/aduana/`; no sale
// por la raíz (`composicion.ts` es de servidor).
export {
  leerAduanaDeLaUnidad,
  NO_SE_CARGO_LA_ADUANA,
  type AduanaDeLaUnidad,
} from '../../infra/aduana/unidad.client'
export {
  buscarUnidades,
  NO_SE_BUSCO,
  type UnidadesBuscadas,
} from '../../infra/aduana/buscar-unidades.client'
export type { UnidadBuscada } from '../../entities/aduana/unidad-buscada'
