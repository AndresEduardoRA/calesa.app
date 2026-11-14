import type { Metadata } from 'next'
import { Suspense } from 'react'
import { requerirSesion } from '@/modules/equipo'
import {
  FormularioPerfil,
  PreferenciasPerfil,
  ZonaDelPerfil,
} from '@/modules/equipo/pantallas/perfil'
import { TurnosDelPerfil } from '@/modules/web/pantallas/perfil'
import { urlPublicaONull } from '@/shared/lib/almacen'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { NotificacionesSeccion } from './notificaciones-seccion'

export const metadata: Metadata = { title: 'Mi perfil' }

// El perfil propio: cualquiera con sesión lo edita, no pide ningún permiso.
export default async function PaginaPerfil() {
  const sesion = await requerirSesion()
  return (
    <div className="grid max-w-2xl gap-4">
      <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">Mi perfil</h1>
      {/* La versión del perfil es la `key`: guardar la ficha de la web la cambia y «Tus datos» se vuelve a montar con la nueva. */}
      <FormularioPerfil
        key={sesion.perfilActualizadoEn}
        usuarioId={sesion.usuarioId}
        nombre={sesion.nombre}
        email={sesion.email}
        avatarRuta={sesion.avatarRuta}
        avatarUrl={urlPublicaONull('avatares', sesion.avatarRuta)}
        actualizadoEn={sesion.perfilActualizadoEn}
      />
      <Suspense fallback={<EsqueletoFormulario bloques={1} campos={1} />}>
        <TurnosDelPerfil permisos={sesion.permisos} miraOtroRol={sesion.perspectiva.rol !== null} />
      </Suspense>
      <PreferenciasPerfil />
      <ZonaDelPerfil elegida={sesion.preferencias.zonaHoraria} />
      <Suspense fallback={<EsqueletoFormulario bloques={1} campos={3} />}>
        <NotificacionesSeccion usuarioId={sesion.usuarioId} permisos={sesion.permisos} />
      </Suspense>
    </div>
  )
}
