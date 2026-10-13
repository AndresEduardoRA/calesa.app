// Composición del módulo en el servidor: acá se decide qué implementación recibe cada interfaz
// de `entities/repositorios`. Los casos de uso de `features/` importan de este archivo, nunca de
// `infra/` (lo verifica eslint-plugin-boundaries).
import 'server-only'
import type {
  BuscadorDeVehiculos,
  LectorDeVehiculo,
  RepositorioVehiculos,
} from './entities/repositorios'
import { buscarVehiculos as buscarEnSupabase, getVehiculo } from './infra/queries/listado'
import { vehiculosSupabase } from './infra/vehiculos'

export const buscarVehiculos: BuscadorDeVehiculos = buscarEnSupabase
export const leerVehiculo: LectorDeVehiculo = getVehiculo
export const repositorioVehiculos: RepositorioVehiculos = vehiculosSupabase
