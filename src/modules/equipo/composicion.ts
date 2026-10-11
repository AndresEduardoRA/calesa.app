// Composición del módulo en el servidor: acá se decide qué implementación recibe cada interfaz
// de `entities/repositorios`. Los casos de uso de `features/` importan de este archivo, nunca de
// `infra/` (lo verifica eslint-plugin-boundaries).
import 'server-only'
import type { LectorDeSesion, RepositorioPerfil, ServicioAcceso } from './entities/repositorios'
import { accesoSupabase } from './infra/acceso'
import { perfilSupabase } from './infra/perfil'
import { getSesion } from './infra/queries/sesion'

export const servicioAcceso: ServicioAcceso = accesoSupabase
export const repositorioPerfil: RepositorioPerfil = perfilSupabase
export const leerSesion: LectorDeSesion = getSesion
