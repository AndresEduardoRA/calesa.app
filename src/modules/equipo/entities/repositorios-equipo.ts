// Lo que los casos de uso de equipo, roles e invitaciones necesitan de afuera. Igual que
// `repositorios.ts`: `features/` depende de estas interfaces y `../composicion.ts` les da la
// implementación de `infra/`.
import type { Resultado } from '@/shared/lib/errores'
import type { Alcance, ClavePermiso } from '@/shared/lib/permisos'
import type { TipoDeEnlace } from './invitacion'
import type { PermisoDelCatalogo } from './matriz'
import type { FiltroDelEquipo, ListaDelEquipo } from './lista-equipo'
import type { BajaHecha, PersonaDelEquipo, VistaPreviaDeBaja } from './persona'
import type { RolConConcesiones } from './rol'

// Toda edición de un rol manda la versión que tenía en pantalla; la base responde `conflicto` si
// otra persona lo cambió, y devuelve la versión nueva para seguir editando sin recargar.
type EdicionDeRol = { rolId: string; actualizadoEnEsperado: string }
type RolEditado = { actualizadoEn: string }

export type RepositorioRoles = {
  crear: (rol: {
    clave: string
    nombre: string
    color: string
  }) => Promise<Resultado<{ id: string }>>
  eliminar: (pedido: EdicionDeRol) => Promise<Resultado<null>>
  otorgar: (
    pedido: EdicionDeRol & { clave: ClavePermiso; origenId: string | null; alcance: Alcance },
  ) => Promise<Resultado<RolEditado>>
  revocar: (
    pedido: EdicionDeRol & { clave: ClavePermiso; origenId: string | null },
  ) => Promise<Resultado<RolEditado>>
  // ¿Domino ese rol? Lo dice la base, con mis permisos reales.
  dominado: (rolId: string) => Promise<Resultado<boolean>>
}

export type RepositorioEquipo = {
  asignarRol: (pedido: {
    personaId: string
    rolId: string
    principal: boolean
  }) => Promise<Resultado<null>>
  quitarRol: (pedido: { personaId: string; rolId: string }) => Promise<Resultado<null>>
  bloquear: (pedido: {
    personaId: string
    bloquear: boolean
    motivo?: string
  }) => Promise<Resultado<null>>
  // Termina en la llamada con una cartera chica; con una grande sigue el job `equipo-bajas` (`terminada: false`).
  darDeBaja: (personaId: string) => Promise<Resultado<BajaHecha>>
  // Sobre la cuenta propia: la persona invitada eligió su contraseña.
  aceptarInvitacion: () => Promise<Resultado<null>>
}

// Lo único que se hace con la API de admin de Auth. Quien lo implementa (`infra/invitaciones.ts`)
// comprueba `equipo.usuarios.gestionar` antes de entregarlo y no expone nada más del cliente admin.
export type CuentasInvitadas = {
  // Crea la cuenta con `app_metadata.invitado = true`, sin contraseña y sin rol.
  crear: (cuenta: { email: string; nombre: string }) => Promise<Resultado<{ personaId: string }>>
  // Compensación: la cuenta se creó pero no se le pudo dar el rol.
  borrar: (personaId: string) => Promise<void>
  enviarCorreo: (email: string) => Promise<Resultado<null>>
  // Reemplaza el enlace vigente de esa cuenta (también el del correo).
  generarEnlace: (email: string) => Promise<Resultado<{ tokenHash: string; tipo: TipoDeEnlace }>>
}

// Ejecuta una tarea con las cuentas invitadas, o responde `sin_permiso` sin crear el cliente admin.
export type ConCuentasInvitadas = <T>(
  tarea: (cuentas: CuentasInvitadas) => Promise<Resultado<T>>,
) => Promise<Resultado<T>>

export type Matriz = { roles: RolConConcesiones[]; catalogo: PermisoDelCatalogo[] }

// Las primeras personas por nombre que cumplen el filtro, con sus roles, y si había más (5a-21). El texto y el estado se resuelven en la base.
export type LectorDeEquipo = (filtro: FiltroDelEquipo) => Promise<Resultado<ListaDelEquipo>>
// Una persona por su id (`?persona=` y `?baja=`), esté o no en la página que se dibuja; nula si no existe.
export type LectorDePersona = (personaId: string) => Promise<Resultado<PersonaDelEquipo | null>>
// ¿El equipo vigente es sólo quien mira? Independiente del filtro: «por ahora el equipo eres tú» no depende de lo que se busca.
export type LectorDeSoloYo = () => Promise<Resultado<boolean>>
export type LectorDeMatriz = () => Promise<Resultado<Matriz>>
export type LectorDeVistaPreviaDeBaja = (personaId: string) => Promise<Resultado<VistaPreviaDeBaja>>
