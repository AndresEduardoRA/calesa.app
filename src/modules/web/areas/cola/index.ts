// La API de servidor del área `cola` de `web`: el tablero de Configuración › Cola web (8.04-2) y sus escrituras (8.04-3). Sale por el `index.ts` de la raíz.
export { leerPoliticaDeLaCola, leerSinAsignar, leerTableroDeLaCola } from './composicion'
export { PANEL_AGREGAR_A_LA_RUEDA } from '../../entities/cola/paneles'
export type { PoliticaDeLaCola } from '../../entities/cola/politica'
export { personasParaLaRueda, type PersonaParaLaRueda } from '../../entities/cola/rueda'
export type { PaginaDeSolicitudes } from '../../entities/cola/solicitudes'
export type { FilaDelTablero, Tablero } from '../../entities/cola/tablero'
