// Composición del área `cotizador` de `repuestos` en el servidor: une la escritura de la configuración (8.12-2) y crear una cotización (8.12-3) con
// sus interfaces. Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type {
  RepositorioDeConfiguracion,
  RepositorioDeCotizaciones,
} from '../../entities/cotizador/repositorio'
import { cotizacionesSupabase } from '../../infra/cotizador/crear-cotizacion'
import { configuracionSupabase } from '../../infra/cotizador/escribir-configuracion'

// Publicar la fórmula y guardar tramos y cajas. Las actions de `features/cotizador/` lo usan.
export const repositorioDeConfiguracion: RepositorioDeConfiguracion = configuracionSupabase

// Crear una cotización (y, en 8.12-4, guardar, aceptar y anular).
export const repositorioDeCotizaciones: RepositorioDeCotizaciones = cotizacionesSupabase
