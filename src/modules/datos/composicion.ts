// Composición del módulo en el servidor: acá se decide qué implementación recibe cada interfaz de `entities/`. Los casos de uso de
// `features/` importan de este archivo, nunca de `infra/` (lo verifica eslint-plugin-boundaries).
import 'server-only'
import { entornoPublico } from '@/shared/config/entorno'
import type { Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type {
  FilaDeCotizacionAExportar,
  FilaDeLeadAExportar,
  FilaDeVehiculoAExportar,
  LectorDeExportacion,
  Registrador,
} from './entities/exportacion'
import type { ClienteDelFlujo } from './infra/cliente-del-flujo'
import {
  clientesDeCotizaciones,
  lectorDeCotizaciones,
  titulosDeVehiculos,
} from './infra/cotizaciones'
import { lectorDeLeads, nombresDePersonas, registradorDe } from './infra/exportacion'
import {
  llamarImportarCsv,
  pedirPaseDeImportacion,
  type AvanceDeImportacion,
} from './infra/importar'
import { lectorDeVehiculos } from './infra/vehiculos'

// Exportar todo (9.05-2): la sesión del flujo (token fijo, verificado dentro del pedido) y lo que se lee con ella.
export { prepararSesion, type ClienteDelFlujo } from './infra/cliente-del-flujo'

export const leerLeadsAExportar: (
  cliente: ClienteDelFlujo,
) => LectorDeExportacion<FilaDeLeadAExportar> = lectorDeLeads

// Los vehículos de un origen (9.05-2b): la tabla bajo la RLS de quien exporta.
export const leerVehiculosAExportar: (
  cliente: ClienteDelFlujo,
  origenId: string,
) => LectorDeExportacion<FilaDeVehiculoAExportar> = lectorDeVehiculos

// Las cotizaciones (9.05-2c): la tabla bajo la RLS de quien exporta, todas o las de un origen, y los nombres de una página (clientes por
// `leads_vista_por_ids`, títulos de vehículos de a 100), siempre con el cliente del flujo.
export const leerCotizacionesAExportar: (
  cliente: ClienteDelFlujo,
  origenId: string | null,
) => LectorDeExportacion<FilaDeCotizacionAExportar> = lectorDeCotizaciones

export const leerClientesDeCotizaciones = clientesDeCotizaciones

export const leerTitulosDeVehiculos = titulosDeVehiculos

// Uno solo para todas las entidades: ninguna fuente trae el suyo, así que ninguna lo puede saltar.
export const registrarExportacion: (cliente: ClienteDelFlujo) => Registrador = registradorDe

export const leerNombresDePersonas = nombresDePersonas

// Importar todo (9.06-3): pide el pase con la sesión del pedido y despierta `importar-csv`. Lo llama la acción de `/datos` (9.06-4) después de
// `importacion_crear`, dentro de `after()`: nadie espera los 45 s. Un fallo no es grave: el job `importaciones-continuar` la retoma.
export async function dispararImportacion(
  importacionId: string,
): Promise<Resultado<AvanceDeImportacion>> {
  const pase = await pedirPaseDeImportacion(await createClient(), importacionId)
  if (!pase.ok) {
    return pase
  }
  return llamarImportarCsv(entornoPublico().NEXT_PUBLIC_SUPABASE_URL, pase.data)
}
