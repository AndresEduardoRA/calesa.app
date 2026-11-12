// La API de servidor del área `cola` de `web`: el tablero de Configuración › Cola web (8.04-2; la 8.04-3 suma las escrituras). Sale por el `index.ts` de la raíz.
export { leerPoliticaDeLaCola, leerSinAsignar, leerTableroDeLaCola } from './composicion'
export type { PoliticaDeLaCola } from '../../entities/cola/politica'
export type { PaginaDeSolicitudes } from '../../entities/cola/solicitudes'
export type { FilaDelTablero, Tablero } from '../../entities/cola/tablero'
