// Composición del módulo en el servidor: acá se decide qué implementación recibe cada interfaz
// de `entities/repositorios`. Los casos de uso de `features/` importan de este archivo, nunca de
// `infra/` (lo verifica eslint-plugin-boundaries).
import 'server-only'
import type {
  BuscadorDeVehiculos,
  ConsultaDeEditables,
  ConsultaDePermiso,
  LectorDeLimpiezaPendiente,
  LectorDePapelera,
  LectorDeGaleria,
  LectorDeRelaciones,
  LectorDeConsultaDeApibara,
  LectorDeSubasta,
  LectorDeVehiculo,
  LectorDeVistaPrevia,
  LectorDeVitrinaDelOrigen,
  RepositorioFotos,
  RepositorioPapelera,
  RepositorioVehiculos,
  RepositorioVitrina,
} from './entities/repositorios'
import { fotosSupabase } from './infra/fotos'
import { papeleraSupabase } from './infra/papelera'
import { getEditables } from './infra/queries/editables'
import { getGaleria } from './infra/queries/fotos'
import { getConPermiso, getLimpiezaPendiente, getPapelera } from './infra/queries/papelera'
import { getConsultaDeApibara, getSubasta } from './infra/queries/subasta'
import { getRelaciones } from './infra/queries/vinculo'
import { getVistaPrevia, getVitrinaDelOrigen } from './infra/queries/vitrina'
import { buscarVehiculos as buscarEnSupabase, getVehiculo } from './infra/queries/listado'
import { vehiculosSupabase } from './infra/vehiculos'
import { vitrinaSupabase } from './infra/vitrina'

export const buscarVehiculos: BuscadorDeVehiculos = buscarEnSupabase
export const leerVehiculo: LectorDeVehiculo = getVehiculo
export const repositorioVehiculos: RepositorioVehiculos = vehiculosSupabase
export const leerGaleria: LectorDeGaleria = getGaleria
export const leerSubasta: LectorDeSubasta = getSubasta
export const leerConsultaDeApibara: LectorDeConsultaDeApibara = getConsultaDeApibara
export const repositorioFotos: RepositorioFotos = fotosSupabase
export const leerRelaciones: LectorDeRelaciones = getRelaciones
export const consultarEditables: ConsultaDeEditables = getEditables
export const repositorioVitrina: RepositorioVitrina = vitrinaSupabase
export const leerVistaPrevia: LectorDeVistaPrevia = getVistaPrevia
export const leerVitrinaDelOrigen: LectorDeVitrinaDelOrigen = getVitrinaDelOrigen
export const repositorioPapelera: RepositorioPapelera = papeleraSupabase
export const leerPapelera: LectorDePapelera = getPapelera
export const consultarPermiso: ConsultaDePermiso = getConPermiso
export const leerLimpiezaPendiente: LectorDeLimpiezaPendiente = getLimpiezaPendiente
