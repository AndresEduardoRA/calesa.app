// Composición del módulo en el servidor: acá se decide qué implementación recibe cada interfaz
// de `entities/repositorios-*`. Los casos de uso de `features/` importan de este archivo, nunca de
// `infra/` (lo verifica eslint-plugin-boundaries).
import 'server-only'
import type {
  CotizadorEncima,
  CreadorDeCotizacion,
  GuardadorDeCotizacion,
  LectorDeHoja,
  LectorDeUnaGuardada,
  RecalculadorAlAbrir,
} from './entities/repositorios-de-hoja'
import type { LectorDeNiveles, RepositorioDeNiveles } from './entities/repositorios-de-niveles'
import { cotizarEncima, crearCotizacion, guardarCotizacion } from './infra/cotizaciones'
import { nivelesSupabase } from './infra/niveles'
import { getHojaParaCotizar } from './infra/queries/hoja'
import { getHojaDeUnaGuardada } from './infra/queries/hoja-de-una-guardada'
import { contarCotizacionesDelVehiculo as contarDeInfra } from './infra/queries/historial-del-vehiculo'
import { getAutoresDeCotizaciones } from './infra/queries/autores-del-listado'
import { getListadoDeCotizaciones } from './infra/queries/listado'
import { getUnaDelListado } from './infra/queries/una-del-listado'
import { getNivelesDeAcceso } from './infra/queries/niveles'
import { recalcularAlAbrir as recalcularAlAbrirDeInfra } from './infra/queries/recalculo'

export const repositorioDeNiveles: RepositorioDeNiveles = nivelesSupabase
export const leerNivelesDeAcceso: LectorDeNiveles = getNivelesDeAcceso
export const leerHojaParaCotizar: LectorDeHoja = getHojaParaCotizar
export const leerHojaDeUnaGuardada: LectorDeUnaGuardada = getHojaDeUnaGuardada
export const recalcularAlAbrir: RecalculadorAlAbrir = recalcularAlAbrirDeInfra
export const creadorDeCotizacion: CreadorDeCotizacion = crearCotizacion
export const guardadorDeCotizacion: GuardadorDeCotizacion = guardarCotizacion
export const contarCotizacionesDelVehiculo = contarDeInfra
export const cotizadorEncima: CotizadorEncima = cotizarEncima
export const leerListadoDeCotizaciones = getListadoDeCotizaciones
// Quién hizo cada cotización de una página del listado (4.16-4a): los nombres por clave primaria de `perfiles`.
export const leerAutoresDeCotizaciones = getAutoresDeCotizaciones
// Una cotización del listado por su id, para el resumen `?cotizacion=` cuando no está en la página (4.16-4b).
export const leerUnaDelListado = getUnaDelListado
