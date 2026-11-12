'use client'

import { useState, type ReactNode } from 'react'
import { Bloque } from '@/shared/ui/bloque'

type Props = {
  titulo: string
  children: ReactNode
}

// Un hueco del resumen de un grupo: un bloque plegado cuyo contenido se monta la primera vez que se abre; al cerrarlo queda montado, para no perder lo que la persona escribió. Mientras está
// cerrado no se monta nada ni se pide el código del área que lo llena.
export function HuecoDelGrupo({ titulo, children }: Props) {
  const [visto, setVisto] = useState(false)
  return (
    <Bloque
      titulo={titulo}
      plegado
      onAbrir={() => {
        setVisto(true)
      }}
    >
      {visto ? children : null}
    </Bloque>
  )
}
