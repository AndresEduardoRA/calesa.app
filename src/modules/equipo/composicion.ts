// Composición del módulo en el servidor: acá se decide qué implementación recibe cada interfaz
// de `entities/repositorios`. Los casos de uso de `features/` importan de este archivo, nunca de
// `infra/` (lo verifica eslint-plugin-boundaries).
import 'server-only'
import type { LectorDeSesion, RepositorioPerfil, ServicioAcceso } from './entities/repositorios'
import type {
  ConCuentasInvitadas,
  LectorDeEquipo,
  LectorDeMatriz,
  LectorDeVistaPreviaDeBaja,
  RepositorioEquipo,
  RepositorioRoles,
} from './entities/repositorios-equipo'
import { accesoSupabase } from './infra/acceso'
import { equipoSupabase } from './infra/equipo'
import { conAdminDeAuth } from './infra/invitaciones'
import { perfilSupabase } from './infra/perfil'
import { getEquipo, getVistaPreviaDeBaja } from './infra/queries/equipo'
import { getMatriz } from './infra/queries/roles'
import { getSesion } from './infra/queries/sesion'
import { rolesSupabase } from './infra/rbac'

export const servicioAcceso: ServicioAcceso = accesoSupabase
export const repositorioPerfil: RepositorioPerfil = perfilSupabase
export const leerSesion: LectorDeSesion = getSesion

export const repositorioRoles: RepositorioRoles = rolesSupabase
export const repositorioEquipo: RepositorioEquipo = equipoSupabase
// La única puerta a la API de admin de Auth (ver `infra/invitaciones.ts`).
export const conCuentasInvitadas: ConCuentasInvitadas = conAdminDeAuth
export const leerEquipo: LectorDeEquipo = getEquipo
export const leerMatriz: LectorDeMatriz = getMatriz
export const leerVistaPreviaDeBaja: LectorDeVistaPreviaDeBaja = getVistaPreviaDeBaja
