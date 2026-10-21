'use client'

import { useEffect, useRef } from 'react'
import { PistaDeDesborde } from './pista-de-desborde'
import { Tabs, TabsList, TabsTrigger } from './tabs'
import { useDesborde } from './use-desborde'

type Props = {
  pestanas: readonly { clave: string; titulo: string }[]
  // La abierta (vive en la URL de quien usa la barra) y qué hace elegir otra.
  valor: string
  alElegir: (clave: string) => void
}

// La barra de pestañas de una pantalla de Configuración. En el celular, y con el texto al 200 %, no entran todas: la barra se desplaza dentro
// de su ancho (`min-w-0`: es hija de una grilla y, sin él, ensanchaba la página; 5a-18), dice por dónde sigue (`<PistaDeDesborde>`) y deja
// a la vista la abierta.
export function PestanasConDesborde({ pestanas, valor, alElegir }: Props) {
  const lista = useRef<HTMLDivElement>(null)
  const desborde = useDesborde(lista)
  useEffect(() => {
    lista.current
      ?.querySelector('[aria-selected=true]')
      ?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [valor])
  return (
    <Tabs
      className="min-w-0"
      value={valor}
      onValueChange={(elegida) => {
        alElegir(String(elegida))
      }}
    >
      <div className="relative max-w-full min-w-0 md:w-fit">
        <TabsList
          ref={lista}
          className="h-11 w-full max-w-full justify-start overflow-x-auto md:h-8 md:w-fit"
        >
          {pestanas.map((pestana) => (
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
