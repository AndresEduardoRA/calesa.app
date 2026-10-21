import type { Metadata } from 'next'
import { requerirSesion } from '@/modules/equipo'
import { FormularioPerfil, PreferenciasPerfil } from '@/modules/equipo/pantallas/perfil'
import { EstadoEnLaRueda } from '@/modules/web/pantallas/perfil'
import { urlPublicaONull } from '@/shared/lib/almacen'

export const metadata: Metadata = { title: 'Mi perfil' }

// El perfil propio: cualquiera con sesión lo edita, no pide ningún permiso.
export default async function PaginaPerfil() {
  const sesion = await requerirSesion()
  return (
    <div className="grid max-w-2xl gap-4">
      <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">Mi perfil</h1>
      <FormularioPerfil
        usuarioId={sesion.usuarioId}
        nombre={sesion.nombre}
        email={sesion.email}
        avatarRuta={sesion.avatarRuta}
        avatarUrl={urlPublicaONull('avatares', sesion.avatarRuta)}
        actualizadoEn={sesion.perfilActualizadoEn}
      />
      <EstadoEnLaRueda permisos={sesion.permisos} />
      <PreferenciasPerfil />
    </div>
  )
}
