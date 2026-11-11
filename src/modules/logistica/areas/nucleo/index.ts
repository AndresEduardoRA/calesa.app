// La API de servidor del núcleo de `logistica` (6.01): la unidad y los huecos de su panel. Sale por el `index.ts` de la raíz.
export { leerUnidad } from './composicion'
export { refDeUnidad } from '../../entities/nucleo/unidad'
export type { RefDeUnidad, Unidad } from '../../entities/nucleo/unidad'
export { huecosVisibles, ORDEN_DE_HUECOS } from '../../entities/nucleo/hueco'
export type { HuecoDeLaUnidad } from '../../entities/nucleo/hueco'
export type { GrupoDeLogistica, HuecoDelGrupo } from '../../entities/nucleo/grupo'
export type { CatalogoDeLogistica, EnlaceDeLogistica } from '../../entities/nucleo/enlaces'
