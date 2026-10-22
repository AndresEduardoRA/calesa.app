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

// Deja a la vista la pestaña abierta moviendo sólo la barra. `scrollIntoView` movía también la página: con la barra fuera de la vista (se
// giró el celular, o se amplió el texto con la página desplazada) la subía de golpe.
function traerLaAbiertaALaVista(barra: HTMLElement) {
  const abierta = barra.querySelector('[aria-selected=true]')
  if (!abierta) {
    return
  }
  const pestana = abierta.getBoundingClientRect()
  const caja = barra.getBoundingClientRect()
  if (pestana.left < caja.left) {
    barra.scrollLeft -= caja.left - pestana.left
  } else if (pestana.right > caja.right) {
    barra.scrollLeft += pestana.right - caja.right
  }
}

// La barra de pestañas de una pantalla de Configuración. En el celular, y con el texto al 200 %, no entran todas: la barra se desplaza dentro
// de su ancho (`min-w-0`: es hija de una grilla y, sin él, ensanchaba la página; 5a-18), dice por dónde sigue (`<PistaDeDesborde>`) y deja
// a la vista la abierta: al abrirla, al elegir otra y cada vez que la barra cambia de tamaño (se amplía el texto con la página abierta, se gira
// el celular: la abierta, que cabía, queda fuera de la vista; c.1).
export function PestanasConDesborde({ pestanas, valor, alElegir }: Props) {
  const lista = useRef<HTMLDivElement>(null)
  const desborde = useDesborde(lista)
  useEffect(() => {
    const barra = lista.current
    if (!barra) {
      return
    }
    traerLaAbiertaALaVista(barra)
    const observador = new ResizeObserver(() => {
      traerLaAbiertaALaVista(barra)
    })
    observador.observe(barra)
    for (const hijo of barra.children) {
      observador.observe(hijo)
    }
    return () => {
      observador.disconnect()
    }
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
