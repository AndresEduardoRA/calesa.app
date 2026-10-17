'use client'

import { MoreHorizontalIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import type { EtapaGuardada } from '../../../entities/embudo'
import { MenuMoverA } from './menu-mover-a'

type Props = {
  id: string
  titulo: string
  etapas: readonly EtapaGuardada[]
  actual: string
  ocupada: boolean
  alMover: (etapa: EtapaGuardada, motivo: string | null) => Promise<boolean>
  alPedirMotivo: (etapa: EtapaGuardada) => void
  alEditar: () => void
  alEliminar: () => void
}

const RENGLON = 'min-h-11 md:min-h-8'

// «Mover a…» a la vista, y «Editar» y «Eliminar» (con «Deshacer») en el «⋯»: sólo con la cartera y
// `leads.editar`. Un solo menú por tarjeta mantiene liviana la sección.
export function AccionesDeOportunidad({
  id,
  titulo,
  etapas,
  actual,
  ocupada,
  alMover,
  alPedirMotivo,
  alEditar,
  alEliminar,
}: Props) {
  return (
    <>
      <MenuMoverA
        id={id}
        titulo={titulo}
        etapas={etapas}
        actual={actual}
        enCurso={ocupada}
        alMover={(etapaId, motivo) => {
          const etapa = etapas.find((e) => e.id === etapaId)
          return etapa ? alMover(etapa, motivo) : Promise.resolve(false)
        }}
        alPedirMotivo={alPedirMotivo}
      />
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Más acciones de «${titulo}»`}
          className="flex size-11 items-center justify-center rounded-(--radius-md) outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) md:size-8"
        >
          <MoreHorizontalIcon aria-hidden className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem className={RENGLON} onClick={alEditar}>
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem className={RENGLON} onClick={alEliminar}>
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
