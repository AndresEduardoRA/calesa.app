// Composición del módulo en el servidor: acá se decide qué implementación recibe cada interfaz de `entities/`. Los casos de uso de
// `features/` importan de este archivo, nunca de `infra/` (lo verifica eslint-plugin-boundaries).
import 'server-only'
import { entornoPublico } from '@/shared/config/entorno'
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
import { crearImportacion, llamarImportarCsv, pedirPaseDeImportacion } from './infra/importar'
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

// Importar todo (9.06-4). El orden lo lleva la acción `crearImportacion`: el navegador ya subió el archivo → `importacion_crear` → el pase,
// pedido con la sesión del pedido → `despertarImportacion` dentro de `after()`, que no lee cookies. Un despertar que falla no es grave: el job
// `importaciones-continuar` la retoma en ≤ 2 min.
export const crearImportacionTotal = crearImportacion

export const pedirPaseParaImportar = pedirPaseDeImportacion

export function despertarImportacion(pase: string) {
  return llamarImportarCsv(entornoPublico().NEXT_PUBLIC_SUPABASE_URL, pase)
}

// A quién darle los leads de una importación total (9.06-4b): personas activas, `id` y `nombre`, hasta `TOPE_DE_DESTINOS`.
export { leerPersonasParaDestino, type PersonaDestino } from './infra/personas'
