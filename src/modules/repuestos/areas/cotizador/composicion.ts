// Composición del área `cotizador` de `repuestos` en el servidor: une la escritura de la configuración (8.12-2), crear una cotización (8.12-3) y guardarla,
// aceptarla y anularla (8.12-4) con sus interfaces. Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type {
  RepositorioDeConfiguracion,
  RepositorioDeCotizaciones,
} from '../../entities/cotizador/repositorio'
import { cotizacionesSupabase } from '../../infra/cotizador/crear-cotizacion'
import { configuracionSupabase } from '../../infra/cotizador/escribir-configuracion'
import { escrituraDeCotizacionesSupabase } from '../../infra/cotizador/escribir-cotizacion'

// Publicar la fórmula y guardar tramos y cajas. Las actions de `features/cotizador/` lo usan.
export const repositorioDeConfiguracion: RepositorioDeConfiguracion = configuracionSupabase

// Crear una cotización (8.12-3) y guardarla, aceptarla y anularla (8.12-4).
export const repositorioDeCotizaciones: RepositorioDeCotizaciones = {
  ...cotizacionesSupabase,
  ...escrituraDeCotizacionesSupabase,
}
