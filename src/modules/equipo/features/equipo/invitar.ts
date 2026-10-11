// Invitar a una persona al equipo, paso a paso. Es sólo el orden de las cosas: lo que toca Auth
// y la base llega por puertos (`entities/repositorios-equipo`), así se prueba con dobles.
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import { MOTIVO_ROL_NO_DOMINADO } from '../../entities/dominancia'
import {
  MENSAJE_YA_ACEPTO,
  MOTIVO_ENLACE_NO_DOMINADO,
  enlaceDeInvitacion,
  type InvitacionHecha,
} from '../../entities/invitacion'
import type { PersonaDelEquipo } from '../../entities/persona'
import type {
  CuentasInvitadas,
  RepositorioEquipo,
  RepositorioRoles,
} from '../../entities/repositorios-equipo'

type Puertos = {
  cuentas: CuentasInvitadas
  roles: Pick<RepositorioRoles, 'dominado'>
  equipo: Pick<RepositorioEquipo, 'asignarRol'>
}

type Pedido = {
  email: string
  nombre: string
  rolId: string
  // La dirección de este sitio (`https://app.empresa.com`): con ella se arma el enlace.
  origen: string
}

// 1. Antes de crear nada: ¿quien invita puede dar ese rol? (nadie asigna lo que no tiene).
// 2. La cuenta nace por la API de admin, marcada como invitada y sin rol.
// 3. El rol se lo da quien invita, con SU sesión: ahí vale la dominancia. Si falla, la cuenta
//    recién creada se borra, para no dejar a alguien adentro sin rol.
// 4. Se intenta el correo. Si no sale, el enlace se genera y se devuelve para pasarlo a mano.
export async function invitarPersona(
  puertos: Puertos,
  pedido: Pedido,
): Promise<Resultado<InvitacionHecha>> {
  const dominado = await puertos.roles.dominado(pedido.rolId)
  if (!dominado.ok) {
    return dominado
  }
  if (!dominado.data) {
    return fallo('sin_permiso', MOTIVO_ROL_NO_DOMINADO)
  }

  const cuenta = await puertos.cuentas.crear({ email: pedido.email, nombre: pedido.nombre })
  if (!cuenta.ok) {
    return cuenta
  }
  const { personaId } = cuenta.data

  const rol = await puertos.equipo.asignarRol({ personaId, rolId: pedido.rolId, principal: true })
  if (!rol.ok) {
    await puertos.cuentas.borrar(personaId)
    return rol
  }

  const correo = await puertos.cuentas.enviarCorreo(pedido.email)
  if (correo.ok) {
    return ok({ personaId, correoEnviado: true, enlace: null })
  }
  const enlace = await puertos.cuentas.generarEnlace(pedido.email)
  return ok({
    personaId,
    correoEnviado: false,
    // Sin correo y sin enlace la cuenta igual existe: desde la lista se genera otro.
    enlace: enlace.ok
      ? enlaceDeInvitacion(pedido.origen, enlace.data.tokenHash, enlace.data.tipo)
      : null,
  })
}

// Un enlace nuevo para alguien que todavía no aceptó. Reemplaza al anterior, también al que
// salió por correo: sólo hay uno vigente.
// Quien abre el enlace elige la contraseña de esa cuenta, o sea que generarlo es poder entrar
// como ella. Por eso exige dominar todos sus roles: si no, alguien que sólo gestiona personas
// podría generarse el enlace de una dueña recién invitada y quedarse con su cuenta.
export async function enlaceParaInvitada(
  puertos: { cuentas: Pick<CuentasInvitadas, 'generarEnlace'>; roles: Puertos['roles'] },
  pedido: { persona: Pick<PersonaDelEquipo, 'email' | 'estado' | 'roles'>; origen: string },
): Promise<Resultado<{ enlace: string }>> {
  if (pedido.persona.estado !== 'invitacion_pendiente') {
    return fallo('regla', MENSAJE_YA_ACEPTO)
  }
  for (const rol of pedido.persona.roles) {
    const dominado = await puertos.roles.dominado(rol.id)
    if (!dominado.ok) {
      return dominado
    }
    if (!dominado.data) {
      return fallo('sin_permiso', MOTIVO_ENLACE_NO_DOMINADO)
    }
  }
  const enlace = await puertos.cuentas.generarEnlace(pedido.persona.email)
  if (!enlace.ok) {
    return enlace
  }
  return ok({ enlace: enlaceDeInvitacion(pedido.origen, enlace.data.tokenHash, enlace.data.tipo) })
}
