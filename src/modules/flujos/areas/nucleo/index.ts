// La API de servidor del NÚCLEO de `flujos` (5.02): lo que comparten las áreas. Sale por el `index.ts` de la raíz, que sólo la reexporta.
// Hoy: las fases de un origen para nombrarlas y filtrar por ellas (el inventario) y el flujo entero para configurarlo (5.02).

// Las fases del flujo de un origen, para nombrarlas y filtrar por ellas (el inventario)
export { leerFasesDeOrigen, leerFlujoParaConfigurar, leerFlujosConfigurables } from './composicion'
export type { FaseResumen } from '../../entities/fase'
export type {
  AmbitoDeFlujo,
  FaseParaConfigurar,
  FlujoConfigurable,
  FlujoParaConfigurar,
  RequisitoParaConfigurar,
  TransicionParaConfigurar,
} from '../../entities/flujo'
