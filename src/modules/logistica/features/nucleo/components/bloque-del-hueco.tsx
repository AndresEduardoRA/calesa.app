'use client'

import type { ReactNode } from 'react'
import { useRef, useState } from 'react'
import { Bloque } from '@/shared/ui/bloque'
import { ATRIBUTO_DEL_BLOQUE, useAlPedirAbrirElHueco } from '../hooks/eventos-de-la-unidad'

type Props = {
  // La clave del hueco (`ORDEN_DE_HUECOS`): con ella el atajo de una falta encuentra el bloque.
  clave: string
  titulo: string
  // Nace abierto: su contenido se monta de una vez.
  abiertoAlInicio?: boolean
  children: ReactNode
}

// Un hueco del panel de la unidad: un bloque plegado cuyo contenido se monta la primera vez que se abre (D9 de 6.01). Mientras está cerrado no se monta nada ni se pide el
// código del área que lo llena; al cerrarlo queda montado, para no perder lo que la persona escribió. Un aviso «abre ese hueco» (el atajo de una falta, 6.04) lo abre si estaba cerrado, lo
// trae a la vista y le lleva el foco a su título.
export function BloqueDelHueco({ clave, titulo, abiertoAlInicio = false, children }: Props) {
  const [visto, setVisto] = useState(abiertoAlInicio)
  const envoltura = useRef<HTMLDivElement>(null)
  useAlPedirAbrirElHueco(clave, () => {
    const detalles = envoltura.current?.querySelector('details')
    if (!detalles) return
    // Abrirlo por el elemento dispara su `toggle`, que monta el contenido.
    detalles.open = true
    detalles.scrollIntoView({ block: 'nearest' })
    detalles.querySelector('summary')?.focus()
  })
  return (
    <div ref={envoltura} {...{ [ATRIBUTO_DEL_BLOQUE]: clave }}>
      <Bloque
        titulo={titulo}
        plegado={!abiertoAlInicio}
        onAbrir={() => {
          setVisto(true)
        }}
      >
        {visto ? children : null}
      </Bloque>
    </div>
  )
}
