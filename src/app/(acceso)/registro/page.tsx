import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getAjustes, registroDisponible } from '@/modules/empresa'
import { FormularioRegistro, RegistroCerrado } from '@/modules/equipo/pantallas/registro'
import { EsqueletoAcceso, TituloAcceso } from '../esqueleto-acceso'

export const metadata: Metadata = { title: 'Crear cuenta' }

async function Contenido() {
  const ajustes = await getAjustes()
  // Con el registro cerrado no hay formulario. Si alguien fuerza el alta igual, la action
  // responde lo mismo y el trigger de la base la rechaza.
  if (!registroDisponible(ajustes)) {
    return <RegistroCerrado />
  }
  return <FormularioRegistro primerRegistro={ajustes.primerRegistro} />
}

export default function PaginaRegistro() {
  return (
    <>
      <TituloAcceso titulo="Crear cuenta" />
      <Suspense fallback={<EsqueletoAcceso campos={3} />}>
        <Contenido />
      </Suspense>
    </>
  )
}
