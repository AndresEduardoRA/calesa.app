// Composición del módulo en el servidor: acá se decide qué implementación recibe cada interfaz
// de `entities/repositorios-*`. Los casos de uso de `features/` importan de este archivo, nunca de
// `infra/` (lo verifica eslint-plugin-boundaries).
import 'server-only'
import type { LectorDeHoja } from './entities/repositorios-de-hoja'
import type { LectorDeNiveles, RepositorioDeNiveles } from './entities/repositorios-de-niveles'
import { nivelesSupabase } from './infra/niveles'
import { getHojaParaCotizar } from './infra/queries/hoja'
import { getNivelesDeAcceso } from './infra/queries/niveles'

export const repositorioDeNiveles: RepositorioDeNiveles = nivelesSupabase
export const leerNivelesDeAcceso: LectorDeNiveles = getNivelesDeAcceso
export const leerHojaParaCotizar: LectorDeHoja = getHojaParaCotizar
