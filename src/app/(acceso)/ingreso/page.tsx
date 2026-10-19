import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getAjustes, registroDisponible } from '@/modules/empresa'
import { avisoDe, googleHabilitado } from '@/modules/equipo'
import { FormularioIngreso } from '@/modules/equipo/pantallas/ingreso'
import { returnToSeguro, unParametro } from '@/shared/lib/rutas'
import { EsqueletoAcceso, TituloAcceso } from '../esqueleto-acceso'

export const metadata: Metadata = { title: 'Ingresar' }

async function Contenido({ searchParams }: Pick<PageProps<'/ingreso'>, 'searchParams'>) {
  const [parametros, ajustes, conGoogle] = await Promise.all([
    searchParams,
    getAjustes(),
    googleHabilitado(),
  ])
  const aviso = unParametro(parametros['aviso'])
  const returnTo = returnToSeguro(unParametro(parametros['returnTo'])) ?? undefined
  return (
    <FormularioIngreso
      // Next conserva el estado de una pantalla al salir y volver. Si se vuelve con otro motivo
      // (otro aviso, otro destino), el formulario arranca limpio: el aviso nuevo no queda tapado
      // por el error de un intento anterior.
      key={`${aviso ?? ''}|${returnTo ?? ''}`}
      returnTo={returnTo}
      conRegistro={registroDisponible(ajustes)}
      conGoogle={conGoogle}
      aviso={avisoDe(aviso)}
    />
  )
}

export default function PaginaIngreso({ searchParams }: PageProps<'/ingreso'>) {
  return (
    <>
      <TituloAcceso titulo="Ingresar" />
      <Suspense fallback={<EsqueletoAcceso campos={2} />}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </>
  )
}
