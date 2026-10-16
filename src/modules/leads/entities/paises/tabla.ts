import { NOMBRES_DE_PAISES } from './nombres'
import { PREFIJOS_COMPARTIDOS, PREFIJOS_DE_PAISES } from './prefijos'
import type { TablaDePaises } from './resolver'

// La tabla entera, para quien la pide con `import()`: el formulario del teléfono, la ficha y la
// importación. No se importa de forma estática ni desde `client.ts`: `/leads` no la carga.
export const TABLA_DE_PAISES: TablaDePaises = {
  nombres: NOMBRES_DE_PAISES,
  prefijos: PREFIJOS_DE_PAISES,
  compartidos: PREFIJOS_COMPARTIDOS,
}
