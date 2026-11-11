'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { Bloque } from '@/shared/ui/bloque'

type Props = {
  titulo: string
  children: ReactNode
}

// Un hueco del panel de la unidad: un bloque plegado cuyo contenido se monta la primera vez que se abre (D9 de 6.01). Mientras está cerrado no se monta nada ni se pide el
// código del área que lo llena; al cerrarlo queda montado, para no perder lo que la persona escribió.
export function BloqueDelHueco({ titulo, children }: Props) {
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
