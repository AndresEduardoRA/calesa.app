// La API de cliente del NÚCLEO de `cotizaciones` para los Client Components de afuera (`.claude/rules/modulos.md`): hooks y tipos puros,
// nada de servidor. Sale por el `client.ts` de la raíz, que sólo reexporta (4.15-4).

// Las opciones del dato del vehículo de una tabla de la hoja (4.14-2c3): la página de cotizar las pasa al panel del vehículo de `vehiculos`.
export {
  useLectorDeOpciones,
  type LectorDeOpciones,
} from '../../features/hoja/hooks/use-lector-de-opciones'
export type { OpcionesDelDato, TablaDelDato } from '../../entities/dato-del-vehiculo'
