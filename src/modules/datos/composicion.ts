// Composición del módulo en el servidor: acá se decide qué implementación recibe cada interfaz de `entities/`. Los casos de uso de
// `features/` importan de este archivo, nunca de `infra/` (lo verifica eslint-plugin-boundaries).
import 'server-only'
import type {
  FilaDeLeadAExportar,
  FilaDeVehiculoAExportar,
  LectorDeExportacion,
  Registrador,
} from './entities/exportacion'
import type { ClienteDelFlujo } from './infra/cliente-del-flujo'
import { lectorDeLeads, nombresDePersonas, registradorDe } from './infra/exportacion'
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

// Uno solo para todas las entidades: ninguna fuente trae el suyo, así que ninguna lo puede saltar.
export const registrarExportacion: (cliente: ClienteDelFlujo) => Registrador = registradorDe

export const leerNombresDePersonas = nombresDePersonas
