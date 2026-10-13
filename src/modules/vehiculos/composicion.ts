// Composición del módulo en el servidor: acá se decide qué implementación recibe cada interfaz
// de `entities/repositorios`. Los casos de uso de `features/` importan de este archivo, nunca de
// `infra/` (lo verifica eslint-plugin-boundaries).
import 'server-only'
import type {
  BuscadorDeVehiculos,
  ConsultaDeEditables,
  LectorDeGaleria,
  LectorDeRelaciones,
  LectorDeVehiculo,
  LectorDeVistaPrevia,
  LectorDeVitrinaDelOrigen,
  RepositorioFotos,
  RepositorioVehiculos,
  RepositorioVitrina,
} from './entities/repositorios'
import { fotosSupabase } from './infra/fotos'
import { getEditables } from './infra/queries/editables'
import { getGaleria } from './infra/queries/fotos'
import { getRelaciones } from './infra/queries/vinculo'
import { getVistaPrevia, getVitrinaDelOrigen } from './infra/queries/vitrina'
import { buscarVehiculos as buscarEnSupabase, getVehiculo } from './infra/queries/listado'
import { vehiculosSupabase } from './infra/vehiculos'
import { vitrinaSupabase } from './infra/vitrina'

export const buscarVehiculos: BuscadorDeVehiculos = buscarEnSupabase
export const leerVehiculo: LectorDeVehiculo = getVehiculo
export const repositorioVehiculos: RepositorioVehiculos = vehiculosSupabase
export const leerGaleria: LectorDeGaleria = getGaleria
export const repositorioFotos: RepositorioFotos = fotosSupabase
export const leerRelaciones: LectorDeRelaciones = getRelaciones
export const consultarEditables: ConsultaDeEditables = getEditables
export const repositorioVitrina: RepositorioVitrina = vitrinaSupabase
export const leerVistaPrevia: LectorDeVistaPrevia = getVistaPrevia
export const leerVitrinaDelOrigen: LectorDeVitrinaDelOrigen = getVitrinaDelOrigen
