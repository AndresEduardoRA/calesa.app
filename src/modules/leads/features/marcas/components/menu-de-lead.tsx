'use client'

import { MoreHorizontalIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import {
  ETIQUETA_DE_FAVORITO,
  ETIQUETA_DE_TACHADO,
  type MarcasDeLead,
} from '../../../entities/marcas'
import { SelectorDeEtiquetas } from '../../etiquetas/components/selector-de-etiquetas'
import type { Etiquetas } from '../../etiquetas/hooks/use-etiquetas'
import { useMarcas } from '../hooks/use-marcas'

// Alto de un renglón del menú: cómodo para el dedo en el celular, compacto con mouse.
const RENGLON = 'min-h-11 md:min-h-8'

type Props = {
  leadId: string
  nombre: string
  marcas: MarcasDeLead
  etiquetas: Etiquetas
  alGestionar: () => void
}

// El «⋯» de una fila del listado: las marcas de quien mira sobre ese lead. «Etiquetas…» cierra el
// menú y abre el selector contra el mismo botón. Nada de lo que pasa adentro abre el drawer de la
// fila (los clics no suben).
export function MenuDeLead({ leadId, nombre, marcas: inicial, etiquetas, alGestionar }: Props) {
  const marcas = useMarcas(leadId, inicial)
  const boton = useRef<HTMLButtonElement>(null)
  const [selector, setSelector] = useState(false)
  // El selector se abre cuando el menú terminó de cerrarse: si no, el foco que vuelve al botón lo cierra.
  const [pendiente, setPendiente] = useState(false)
  const { esFavorito, estaTachado } = marcas.marcas
  return (
    <div
      className="flex justify-end"
      onClick={(evento) => {
        evento.stopPropagation()
      }}
    >
      <DropdownMenu
        onOpenChangeComplete={(abierto) => {
          if (!abierto && pendiente) {
            setPendiente(false)
            setSelector(true)
          }
        }}
      >
        <DropdownMenuTrigger
          ref={boton}
          aria-label={`Marcas de ${nombre}`}
          className="flex size-11 items-center justify-center rounded-(--radius-md) outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) md:size-8"
        >
          <MoreHorizontalIcon aria-hidden className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuCheckboxItem
            className={RENGLON}
            checked={esFavorito}
            disabled={marcas.enCurso.favorito}
            onCheckedChange={(valor) => void marcas.favorito(valor)}
          >
            {ETIQUETA_DE_FAVORITO}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            className={RENGLON}
            checked={estaTachado}
            disabled={marcas.enCurso.tachado}
            closeOnClick
            onCheckedChange={(valor) => void marcas.tachado(valor)}
          >
            {ETIQUETA_DE_TACHADO}
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className={RENGLON}
            onClick={() => {
              setPendiente(true)
            }}
          >
            Etiquetas…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <SelectorDeEtiquetas
        etiquetas={etiquetas}
        puestas={marcas.marcas.etiquetas}
        alCambiar={(id, valor) => void marcas.etiqueta(id, valor)}
        enCurso={marcas.enCurso.etiquetas}
        alGestionar={alGestionar}
        abierto={selector}
        alCambiarAbierto={setSelector}
        ancla={boton}
      />
    </div>
  )
}
