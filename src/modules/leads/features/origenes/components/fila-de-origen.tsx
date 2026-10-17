'use client'

import { Badge } from '@/shared/ui/badge'
import { Switch } from '@/shared/ui/switch'
import type { Direccion, OrigenDeLeadConUso } from '../../../entities/origen-de-lead'
import { AccionesDeOrigen } from './acciones-de-origen'
import { BotonesDeOrden } from './botones-de-orden'

type Props = {
  origen: OrigenDeLeadConUso
  puedeSubir: boolean
  puedeBajar: boolean
  alActivar: (activo: boolean) => void
  alMover: (direccion: Direccion) => void
  alEditar: () => void
  alPedirEliminar: () => void
}

// Un origen del lead: su orden, su nombre, «Activo» (guarda solo) y editar o eliminar. Uno apagado se
// sigue nombrando, con «Desactivado»: sus leads lo conservan, pero no se ofrece en un lead nuevo. En el
// celular las acciones bajan a su propia línea (objetivos de 44 px).
export function FilaDeOrigen({
  origen,
  puedeSubir,
  puedeBajar,
  alActivar,
  alMover,
  alEditar,
  alPedirEliminar,
}: Props) {
  const colorDelNombre = origen.activo ? 'text-(--color-ink)' : 'text-(--color-ink-soft)'
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2">
      <BotonesDeOrden
        id={origen.id}
        nombre={origen.nombre}
        puedeSubir={puedeSubir}
        puedeBajar={puedeBajar}
        alMover={alMover}
      />
      <div className="order-2 grid min-w-40 flex-1 gap-0.5">
        <span className="flex flex-wrap items-center gap-2">
          <span className={`text-(length:--text-base) font-medium ${colorDelNombre}`}>
            {origen.nombre}
          </span>
          {origen.activo ? null : <Badge variant="outline">Desactivado</Badge>}
        </span>
        <span className="text-(length:--text-sm) text-(--color-ink-faint)">
          {origen.conLeads ? 'Tiene leads' : 'Sin leads'}
          {origen.activo ? '' : ' · no se ofrece en un lead nuevo'}
        </span>
      </div>
      <label className="order-4 flex min-h-11 items-center gap-2 text-(length:--text-sm) text-(--color-ink-soft) md:order-3 md:min-h-8">
        <Switch
          size="sm"
          aria-label={`${origen.nombre}: activo`}
          checked={origen.activo}
          onCheckedChange={alActivar}
        />
        Activo
      </label>
      <AccionesDeOrigen origen={origen} alEditar={alEditar} alPedirEliminar={alPedirEliminar} />
    </li>
  )
}
