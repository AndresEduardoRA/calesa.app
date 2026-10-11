import 'server-only'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createAdminClient } from '@/shared/lib/supabase/admin'
import { createClient } from '@/shared/lib/supabase/server'
import { errorDeAuth } from '../entities/errores-acceso'
import type { ConCuentasInvitadas, CuentasInvitadas } from '../entities/repositorios-equipo'

// LA EXCEPCIÓN del cliente admin (.claude/rules/datos.md). Invitar exige la API de admin de Auth
// (`auth.admin.*`), que sólo anda con la secret key. Este archivo es el único de la app que crea
// ese cliente fuera del portal, los webhooks y los crons, y lo hace con tres candados:
//   1. `conAdminDeAuth()` comprueba `equipo.usuarios.gestionar` en la base, con el cliente de
//      quien invita, ANTES de crear el cliente admin.
//   2. Del cliente admin sólo sale `auth.admin`, envuelto en `CuentasInvitadas`: nadie recibe
//      `.from()` ni `.rpc()`, así que no puede leer `leads`, `vehiculos` ni `cotizaciones`.
//   3. El rol no se asigna acá: lo hace `rbac_asignar_rol` con la sesión de quien invita, para
//      que valga la dominancia.

type AdminDeAuth = ReturnType<typeof createAdminClient>['auth']['admin']

function cuentasCon(admin: AdminDeAuth): CuentasInvitadas {
  return {
    async crear({ email, nombre }) {
      // Sin contraseña y sin confirmar: la persona la elige al abrir su enlace. La marca
      // `invitado` es lo que deja pasar el alta con el registro cerrado.
      const { data, error } = await admin.createUser({
        email,
        app_metadata: { invitado: true },
        user_metadata: nombre ? { nombre } : {},
      })
      if (error) {
        return { ok: false, error: errorDeAuth(error) }
      }
      return ok({ personaId: data.user.id })
    },

    async borrar(personaId) {
      const { error } = await admin.deleteUser(personaId)
      if (error) {
        // Queda una cuenta invitada sin rol: se ve en la lista del equipo y se puede dar de baja.
        console.error(`No se pudo deshacer la cuenta invitada ${personaId}: ${error.message}`)
      }
    },

    async enviarCorreo(email) {
      const { error } = await admin.inviteUserByEmail(email)
      if (error) {
        return { ok: false, error: errorDeAuth(error) }
      }
      return ok(null)
    },

    async generarEnlace(email) {
      const invitacion = await admin.generateLink({ type: 'invite', email })
      if (!invitacion.error) {
        return ok({ tokenHash: invitacion.data.properties.hashed_token, tipo: 'invite' })
      }
      if (invitacion.error.code !== 'email_exists') {
        return { ok: false, error: errorDeAuth(invitacion.error) }
      }
      // Ya abrió un enlace (su correo quedó confirmado) pero no eligió contraseña: Auth no deja
      // invitarla de nuevo. Uno de recuperación la lleva a la misma pantalla.
      const recuperacion = await admin.generateLink({ type: 'recovery', email })
      if (recuperacion.error) {
        return { ok: false, error: errorDeAuth(recuperacion.error) }
      }
      return ok({ tokenHash: recuperacion.data.properties.hashed_token, tipo: 'recovery' })
    },
  }
}

export const conAdminDeAuth: ConCuentasInvitadas = async (tarea) => {
  const supabase = await createClient()
  const { data: puede, error } = await supabase.rpc('tiene_permiso', {
    p_clave: 'equipo.usuarios.gestionar',
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  if (!puede) {
    return fallo('sin_permiso', 'No tienes permiso para invitar personas al equipo.')
  }
  return tarea(cuentasCon(createAdminClient().auth.admin))
}
