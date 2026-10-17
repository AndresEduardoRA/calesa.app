'use client'

import { ArrowRightLeftIcon } from 'lucide-react'
import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import type { EtapaGuardada } from '../../../entities/embudo'
import { PuntoDeColor } from '../../etiquetas/components/insignia-de-etiqueta'

type Props = {
  // Para el foco de vuelta del modal del motivo (`data-mover-a`) y el nombre del botón.
  id: string
  titulo: string
  // Las etapas de su embudo, en orden, y en la que está.
  etapas: readonly EtapaGuardada[]
  actual: string
  enCurso: boolean
  alMover: (etapaId: string, motivo: string | null) => Promise<boolean>
  // Ir a una etapa perdida pregunta el motivo: lo hace un modal con su URL, que monta quien tiene las oportunidades.
  alPedirMotivo: (etapa: EtapaGuardada) => void
}

// «Mover a…»: un menú con las etapas de su embudo (sin arrastrar: se opera con el teclado y con el
// dedo, y el porqué de un rechazo se dice). Ir a una perdida pregunta el motivo (`?panel=mover-oportunidad`).
export function MenuMoverA({ id, titulo, etapas, actual, enCurso, alMover, alPedirMotivo }: Props) {
  const [abierta, setAbierta] = useState<EtapaGuardada | null>(null)
  return (
    <>
      <DropdownMenu
        onOpenChangeComplete={(abierto) => {
          // El modal se abre cuando el menú terminó de cerrarse (si no, el foco que vuelve lo cierra).
          if (!abierto && abierta) {
            alPedirMotivo(abierta)
            setAbierta(null)
          }
        }}
      >
        <DropdownMenuTrigger
          disabled={enCurso}
          data-mover-a={id}
          aria-label={`Mover «${titulo}» a otra etapa`}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-(--radius-md) border border-(--color-line) px-2.5 text-(length:--text-sm) whitespace-nowrap outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) disabled:opacity-50 md:min-h-8"
        >
          <ArrowRightLeftIcon aria-hidden className="size-3.5" />
          Mover a…
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Mover a</DropdownMenuLabel>
            {etapas
              .filter((etapa) => etapa.id !== actual)
              .map((etapa) => (
                <DropdownMenuItem
                  key={etapa.id}
                  className="min-h-11 md:min-h-8"
                  onClick={() => {
                    if (etapa.esPerdida) {
                      setAbierta(etapa)
                      return
                    }
                    void alMover(etapa.id, null)
                  }}
                >
                  <PuntoDeColor color={etapa.color} className="size-2.5" />
                  {etapa.nombre}
                </DropdownMenuItem>
              ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
