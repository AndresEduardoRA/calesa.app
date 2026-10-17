// La persona que está usando la app en este request: su cuenta, sus roles y lo que puede hacer.
// Sale de la RPC `mi_sesion()` (una sola ida a la base). Acá sólo se le da forma.
import { z } from 'zod'
import { concesionesDe, type Permisos } from '@/shared/lib/permisos'
import { SIN_PERSPECTIVA, perspectivaDesde, type Perspectiva } from './perspectiva'
import { preferenciasDesde, type Preferencias } from './preferencias'

export const ESTADOS_CUENTA = ['activa', 'bloqueada', 'baja'] as const
// bloqueada = no puede operar, no pierde nada; baja = salió del equipo (sus leads van al limbo).
export type EstadoCuenta = (typeof ESTADOS_CUENTA)[number]

export type RolDeLaPersona = {
  id: string
  clave: string
  nombre: string
  color: string | null
  esPrincipal: boolean
}

export type Sesion = {
  usuarioId: string
  estado: EstadoCuenta
  nombre: string
  email: string
  // Ruta dentro del bucket público `avatares`.
  avatarRuta: string | null
  // ISO. Lo manda de vuelta el formulario de perfil para detectar un cambio ajeno.
  perfilActualizadoEn: string
  // Los nombres salen de la base: sirven para mostrarlos, nunca para decidir qué se puede hacer.
  roles: RolDeLaPersona[]
  // Los EFECTIVOS: con una perspectiva «ver como» activa, los que la interfaz debe dibujar
  // (nunca más que los reales). Vacío si la cuenta no está activa o no tiene ningún rol.
  permisos: Permisos
  perspectiva: Perspectiva
  preferencias: Preferencias
}

const esquemaSesion = z.object({
  estado: z.enum(ESTADOS_CUENTA),
  perfil: z.object({
    // guid y no uuid: `z.uuid()` exige versión y variante RFC, y Postgres acepta cualquier uuid.
    id: z.guid(),
    nombre: z.string(),
    email: z.string().nullable(),
    avatar_ruta: z.string().nullable(),
    actualizado_en: z.string(),
  }),
  roles: z.array(
    z.object({
      id: z.guid(),
      clave: z.string(),
      nombre: z.string(),
      color: z.string().nullable(),
      es_principal: z.boolean(),
    }),
  ),
  permisos: z.unknown(),
  perspectiva: z.unknown(),
  preferencias: z.unknown(),
})

// `null` cuando la RPC no devolvió nada: hay sesión de Auth pero no hay perfil (la cuenta se
// eliminó con la sesión abierta). Una forma inesperada sí es un error: lanza.
export function sesionDesde(json: unknown): Sesion | null {
  if (json === null || json === undefined) {
    return null
  }
  const { estado, perfil, roles, permisos, perspectiva, preferencias } = esquemaSesion.parse(json)
  return {
    usuarioId: perfil.id,
    estado,
    nombre: perfil.nombre,
    email: perfil.email ?? '',
    avatarRuta: perfil.avatar_ruta,
    perfilActualizadoEn: perfil.actualizado_en,
    roles: roles.map((rol) => ({
      id: rol.id,
      clave: rol.clave,
      nombre: rol.nombre,
      color: rol.color,
      esPrincipal: rol.es_principal,
    })),
    permisos: concesionesDe(permisos),
    perspectiva: perspectivaDesde(perspectiva),
    preferencias: preferenciasDesde(preferencias),
  }
}

// Lo que se arma cuando hay sesión de Auth sin perfil: se trata como una baja, que es lo que es.
export function sesionSinPerfil(usuarioId: string, email: string): Sesion {
  return {
    usuarioId,
    estado: 'baja',
    nombre: '',
    email,
    avatarRuta: null,
    perfilActualizadoEn: '',
    roles: [],
    permisos: [],
    perspectiva: SIN_PERSPECTIVA,
    preferencias: { densidad: null, tema: null, porPagina: null },
  }
}

// Una persona recién registrada (que no es la primera) o recién invitada puede no tener rol
// todavía: entra, pero no ve nada hasta que alguien se lo asigne.
export function sinRol(sesion: Pick<Sesion, 'roles'>): boolean {
  return sesion.roles.length === 0
}

// Cómo llamarla en pantalla: su nombre o, si todavía no lo cargó, la parte local de su correo.
export function nombreVisible(sesion: Pick<Sesion, 'nombre' | 'email'>): string {
  return sesion.nombre.trim() || sesion.email.split('@')[0] || 'Sin nombre'
}
