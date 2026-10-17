'use client'

import { MenuIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button } from '@/shared/ui/button'
import { Drawer } from '@/shared/ui/drawer'

type Props = {
  // Nombre de la empresa: es el título del panel.
  titulo: string
  // La misma <BarraLateral> del escritorio, ya filtrada en el servidor.
  children: ReactNode
}

// En pantallas angostas la barra lateral vive detrás de este botón (de 44 px siempre: un blanco táctil no crece con el texto). `Esc` la cierra por el
// registro de atajos (lo hace <Drawer>).
export function MenuMovil({ titulo, children }: Props) {
  const [abierto, setAbierto] = useState(false)

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon-lg"
        className="size-[44px]"
        aria-label="Abrir el menú"
        aria-expanded={abierto}
        onClick={() => {
          setAbierto(true)
        }}
      >
        <MenuIcon aria-hidden />
      </Button>
      <Drawer
        abierto={abierto}
        alCerrar={() => {
          setAbierto(false)
        }}
        titulo={titulo}
        lado="left"
      >
        {/* Al elegir un destino el panel se cierra solo. */}
        <div
          onClick={(evento) => {
            if (evento.target instanceof Element && evento.target.closest('a')) {
              setAbierto(false)
            }
          }}
        >
          {children}
        </div>
      </Drawer>
    </div>
  )
}
