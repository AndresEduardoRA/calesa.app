'use client'

import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs'
import { useEffect, useRef } from 'react'
import { PistaDeDesborde } from '@/shared/ui/pista-de-desborde'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { useDesborde } from '@/shared/ui/use-desborde'
import { CLAVES_DE_PESTANA, PESTANAS, pestanaDe } from './pestanas'

const PARAMETROS = {
  seccion: parseAsStringLiteral(CLAVES_DE_PESTANA).withDefault('campos'),
  // El panel de una pestaña no sobrevive al cambiar a otra.
  campo: parseAsString,
  panel: parseAsString,
  origen: parseAsString,
  tipo: parseAsString,
}

// La pestaña abierta vive en la URL: se puede recargar y compartir el enlace. En el celular, y con el texto al 200 %, no entran las
// tres: la barra se desplaza dentro de su ancho (`min-w-0`: hija de una grilla, si no ensancha la página), dice por dónde sigue y
// deja a la vista la abierta.
export function PestanasDeLeads() {
  const [{ seccion }, setParametros] = useQueryStates(PARAMETROS, { shallow: false })
  const lista = useRef<HTMLDivElement>(null)
  const desborde = useDesborde(lista)
  useEffect(() => {
    lista.current
      ?.querySelector('[aria-selected=true]')
      ?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [seccion])
  return (
    <Tabs
      className="min-w-0"
      value={seccion}
      onValueChange={(elegida) => {
        void setParametros({
          seccion: pestanaDe(String(elegida)),
          campo: null,
          panel: null,
          origen: null,
          tipo: null,
        })
      }}
    >
      <div className="relative max-w-full min-w-0 md:w-fit">
        <TabsList
          ref={lista}
          className="h-11 w-full max-w-full justify-start overflow-x-auto md:h-8 md:w-fit"
        >
          {PESTANAS.map((pestana) => (
            <TabsTrigger key={pestana.clave} value={pestana.clave} className="px-3">
              {pestana.titulo}
            </TabsTrigger>
          ))}
        </TabsList>
        <PistaDeDesborde {...desborde} />
      </div>
    </Tabs>
  )
}
