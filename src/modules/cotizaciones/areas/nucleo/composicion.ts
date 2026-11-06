// Composición del NÚCLEO de `cotizaciones` en el servidor: acá se decide qué implementación recibe cada interfaz de
// `entities/repositorios-*`. Los casos de uso del núcleo importan de este archivo, nunca de `infra/` (lo verifica eslint-plugin-boundaries)
// ni de la `composicion.ts` de la raíz, que sólo reexporta (4.15-4).
import 'server-only'
import type {
  CotizadorEncima,
  CreadorDeCotizacion,
  GuardadorDeCotizacion,
  LectorDeHoja,
  LectorDeUnaGuardada,
  RecalculadorAlAbrir,
} from '../../entities/repositorios-de-hoja'
import type { LectorDeNiveles, RepositorioDeNiveles } from '../../entities/repositorios-de-niveles'
import { cotizarEncima, crearCotizacion, guardarCotizacion } from '../../infra/cotizaciones'
import { nivelesSupabase } from '../../infra/niveles'
import { getHojaParaCotizar } from '../../infra/queries/hoja'
import { getHojaDeUnaGuardada } from '../../infra/queries/hoja-de-una-guardada'
import { contarCotizacionesDelVehiculo as contarDeInfra } from '../../infra/queries/historial-del-vehiculo'
import { getNivelesDeAcceso } from '../../infra/queries/niveles'
import { recalcularAlAbrir as recalcularAlAbrirDeInfra } from '../../infra/queries/recalculo'

export const repositorioDeNiveles: RepositorioDeNiveles = nivelesSupabase
export const leerNivelesDeAcceso: LectorDeNiveles = getNivelesDeAcceso
export const leerHojaParaCotizar: LectorDeHoja = getHojaParaCotizar
export const leerHojaDeUnaGuardada: LectorDeUnaGuardada = getHojaDeUnaGuardada
export const recalcularAlAbrir: RecalculadorAlAbrir = recalcularAlAbrirDeInfra
export const creadorDeCotizacion: CreadorDeCotizacion = crearCotizacion
export const guardadorDeCotizacion: GuardadorDeCotizacion = guardarCotizacion
export const contarCotizacionesDelVehiculo = contarDeInfra
export const cotizadorEncima: CotizadorEncima = cotizarEncima
