// Lo que los casos de uso de `features/` necesitan de afuera. `features` no importa `infra`:
// depende de estas interfaces y `../composicion.ts` les da la implementación (Supabase).
import type { Resultado } from '@/shared/lib/errores'
import type { PedidoDeCanje } from './canje'
import type { Preferencia } from './preferencias'
import type { EstadoCuenta, Sesion } from './sesion'

export type Credenciales = { email: string; contrasena: string }

// Después de crear una sesión siempre se sabe en qué estado está la cuenta: una bloqueada o
// dada de baja no se queda adentro.
type SesionCreada = { estado: EstadoCuenta }

export type ServicioAcceso = {
  ingresar: (credenciales: Credenciales) => Promise<Resultado<SesionCreada>>
  // `sesionIniciada: false` = falta confirmar el correo (o el correo ya tenía cuenta: Auth no
  // lo distingue a propósito).
  registrar: (
    datos: Credenciales & { nombre: string },
  ) => Promise<Resultado<{ sesionIniciada: boolean }>>
  pedirRecuperacion: (email: string) => Promise<Resultado<null>>
  fijarContrasena: (contrasena: string) => Promise<Resultado<null>>
  // `volverA` = la URL de `/auth/callback` en este mismo sitio, con su `next`.
  urlDeGoogle: (volverA: string) => Promise<Resultado<{ url: string }>>
  canjear: (
    pedido: Extract<PedidoDeCanje, { tipo: 'codigo' | 'enlace' }>,
  ) => Promise<Resultado<SesionCreada>>
  // Sólo esta sesión: los otros dispositivos de la persona siguen adentro.
  cerrarSesion: () => Promise<void>
  googleHabilitado: () => Promise<boolean>
}

export type LectorDeSesion = () => Promise<Sesion | null>

export type RepositorioPerfil = {
  // `avatarRuta: undefined` = no tocar la foto; `null` = quitarla.
  actualizar: (pedido: {
    usuarioId: string
    nombre: string
    avatarRuta?: string | null
    actualizadoEnEsperado: string
  }) => Promise<Resultado<{ actualizadoEn: string }>>
  guardarPreferencia: (usuarioId: string, preferencia: Preferencia) => Promise<Resultado<null>>
}
