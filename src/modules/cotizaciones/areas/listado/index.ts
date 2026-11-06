// La API de servidor del área `listado` de `cotizaciones`. Sale por el `index.ts` de la raíz, que sólo la reexporta (4.15-4).
//
// El listado `/cotizaciones` (4.16-1, la pantalla en el 4.16-4a): una página por cursor, con la RLS de quien mira, y su máximo medido; los autores de la página, por clave
// primaria; sus filtros y las filas con los nombres que la pantalla le suma. Los componentes salen por `pantallas/listado.ts`.
export {
  leerAutoresDeCotizaciones,
  leerListadoDeCotizaciones,
  leerUnaDelListado,
} from './composicion'
export {
  CLAVE_DE_RESUMEN_DE_COTIZACION,
  idDelResumen,
} from '../../entities/listado/resumen-del-listado'
export type { LecturaDelServidor } from '../../entities/listado/resumen-del-listado'
export { filasConNombres, idsDe } from '../../entities/listado/filas-del-listado'
export type { CotizacionDelListado } from '../../entities/listado/filas-del-listado'
export {
  esquemaDelListado,
  origenParaNueva,
  pedidoDelListado,
} from '../../entities/listado/filtros-del-listado'
export { MAXIMO_DE_PAGINA_DE_COTIZACIONES } from '../../entities/listado/listado'
export type {
  ClaseDeCotizacion,
  EstadoDeCotizacion,
  FilaDelListado,
  PedidoDelListado,
} from '../../entities/listado/listado'
