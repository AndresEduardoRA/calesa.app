'use client'

import type { ReactNode } from 'react'
import { Button } from '@/shared/ui/button'

type Props = {
  cambios: boolean
  alDescartar: () => void
  // «Publicar» y su motivo.
  children?: ReactNode
}

// El pie del editor de tablas (4.23-3, C8 y C9): con cambios, dónde quedan y «Descartar los cambios»; y «Publicar».
export function BarraDeCambios({ cambios, alDescartar, children }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-(--color-line) pt-3">
      <p className="min-w-0 flex-1 basis-60 text-(length:--text-sm) text-(--color-ink-soft)">
        {cambios
          ? 'Cambios sin publicar: quedan en esta pestaña del navegador hasta que publiques o los descartes.'
          : 'Sin cambios que publicar.'}
      </p>
      {cambios ? (
        <Button type="button" variant="ghost" className="min-h-11 md:min-h-9" onClick={alDescartar}>
          Descartar los cambios
        </Button>
      ) : null}
      {children}
    </div>
  )
}
