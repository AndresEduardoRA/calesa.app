import type { Metadata } from 'next'
import { Suspense } from 'react'
import { avisoDe } from '@/modules/equipo'
import { FormularioRecuperar } from '@/modules/equipo/pantallas/recuperar'
import { unParametro } from '@/shared/lib/rutas'
import { EsqueletoAcceso, TituloAcceso } from '../esqueleto-acceso'

export const metadata: Metadata = { title: 'Recuperar la contraseña' }

async function Contenido({ searchParams }: Pick<PageProps<'/recuperar'>, 'searchParams'>) {
  const aviso = unParametro((await searchParams)['aviso'])
  // Mismo motivo que en el ingreso: volver con otro aviso arranca el formulario limpio.
  return <FormularioRecuperar key={aviso ?? ''} aviso={avisoDe(aviso)} />
}

export default function PaginaRecuperar({ searchParams }: PageProps<'/recuperar'>) {
  return (
    <>
      <TituloAcceso
        titulo="Recuperar la contraseña"
        bajada="Te enviamos un enlace al correo de tu cuenta para elegir una nueva."
      />
      <Suspense fallback={<EsqueletoAcceso campos={1} />}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </>
  )
}
