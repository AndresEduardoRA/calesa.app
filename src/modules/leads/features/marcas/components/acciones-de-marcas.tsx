'use client'

import { TagIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/shared/ui/button'
import { SelectorDeEtiquetas } from '../../etiquetas/components/selector-de-etiquetas'
import type { Etiquetas } from '../../etiquetas/hooks/use-etiquetas'
import type { Marcas } from '../hooks/use-marcas'
import { BotonDeMarca } from './boton-de-marca'

type Props = {
  marcas: Marcas
  etiquetas: Etiquetas
  alGestionar: () => void
}

// Las marcas de quien mira en la cabecera de la ficha: «Favorito», «Tachado» y el selector de sus
// etiquetas. Basta con ver el lead: no dependen de poder editarlo.
export function AccionesDeMarcas({ marcas, etiquetas, alGestionar }: Props) {
  const [selector, setSelector] = useState(false)
  const puestas = marcas.marcas.etiquetas.length
  return (
    <>
      <BotonDeMarca
        marca="favorito"
        activo={marcas.marcas.esFavorito}
        enCurso={marcas.enCurso.favorito}
        alCambiar={(valor) => void marcas.favorito(valor)}
      />
      <BotonDeMarca
        marca="tachado"
        activo={marcas.marcas.estaTachado}
        enCurso={marcas.enCurso.tachado}
        alCambiar={(valor) => void marcas.tachado(valor)}
      />
      <SelectorDeEtiquetas
        etiquetas={etiquetas}
        puestas={marcas.marcas.etiquetas}
        alCambiar={(id, valor) => void marcas.etiqueta(id, valor)}
        enCurso={marcas.enCurso.etiquetas}
        alGestionar={alGestionar}
        abierto={selector}
        alCambiarAbierto={setSelector}
        disparador={
          <Button type="button" variant="outline" className="h-11 md:h-9">
            <TagIcon aria-hidden className="size-4" />
            Etiquetas
            {puestas > 0 ? (
              <span className="text-(--color-ink-soft) tabular-nums">{puestas}</span>
            ) : null}
          </Button>
        }
      />
    </>
  )
}
