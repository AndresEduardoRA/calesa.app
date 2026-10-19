import type { Metadata } from 'next'
import { Suspense } from 'react'
import { requerirSesionDeEnlace } from '@/modules/equipo'
import { FormularioNuevaContrasena } from '@/modules/equipo/pantallas/nueva-contrasena'
import { EsqueletoAcceso, TituloAcceso } from '../../esqueleto-acceso'

export const metadata: Metadata = { title: 'Elegir la contraseña' }

// Acá llega quien abrió el enlace de recuperación y, más adelante, quien fue invitado: los dos
// ya traen sesión (la creó /auth/callback) y sólo les falta elegir la contraseña.
async function Contenido() {
  await requerirSesionDeEnlace()
  return <FormularioNuevaContrasena />
}

export default function PaginaNuevaContrasena() {
  return (
    <>
      <TituloAcceso titulo="Elegir la contraseña" bajada="Es la que vas a usar para ingresar." />
      <Suspense fallback={<EsqueletoAcceso campos={2} />}>
        <Contenido />
      </Suspense>
    </>
  )
}
