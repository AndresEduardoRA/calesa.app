// La API de servidor de el área `alertas` de `logistica` (6.12-2): la bandeja de Inicio (demoradas, trabados y por aprobar), sus
// textos. La consumen los bloques de `tablero`. Las alertas mismas las escribe la base (jobs de 6.12-1). Sale por el `index.ts` de la raíz.
export { bandejaLogistica } from './composicion'
export {
  detalleDeDemorada,
  detalleDeTrabado,
  type BandejaDeLogistica,
  type FilaDemorada,
  type FilaPorAprobar,
  type FilaTrabada,
  type ListaDeLaBandeja,
} from '../../entities/alertas/bandeja'
