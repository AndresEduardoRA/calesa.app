'use client'

import { Badge } from '@/shared/ui/badge'
import { Switch } from '@/shared/ui/switch'
import {
  NOMBRE_DE_CLASE,
  type Direccion,
  type TipoDeLeadConUso,
} from '../../../entities/tipo-de-lead'
import { AccionesDeTipo } from './acciones-de-tipo'
import { BotonesDeOrden } from './botones-de-orden'

type Props = {
  tipo: TipoDeLeadConUso
  // El último activo de su clase: «Activo» no se apaga y se dice acá, antes de intentarlo.
  unicoActivo: boolean
  motivoNoDesactivar: string | null
  motivoNoEliminar: string | null
  puedeSubir: boolean
  puedeBajar: boolean
  alActivar: (activo: boolean) => void
  alMover: (direccion: Direccion) => void
  alEditar: () => void
  alPedirEliminar: () => void
}

// Un tipo de lead: su orden, su nombre con su clase, «Activo» (guarda solo) y editar o eliminar. Uno apagado se sigue nombrando,
// con «Desactivado»: sus leads lo conservan, pero no se ofrece en un lead nuevo. En el celular las acciones bajan a su propia
// línea (objetivos de 44 px).
export function FilaDeTipo({
  tipo,
  unicoActivo,
  motivoNoDesactivar,
  motivoNoEliminar,
  puedeSubir,
  puedeBajar,
  alActivar,
  alMover,
  alEditar,
  alPedirEliminar,
}: Props) {
  const colorDelNombre = tipo.activo ? 'text-(--color-ink)' : 'text-(--color-ink-soft)'
  const idDelMotivo = `tipo-${tipo.id}-unico`
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2">
      <BotonesDeOrden
        id={tipo.id}
        nombre={tipo.nombre}
        puedeSubir={puedeSubir}
        puedeBajar={puedeBajar}
        alMover={alMover}
      />
      <div className="order-2 grid min-w-40 flex-1 gap-0.5">
        <span className="flex flex-wrap items-center gap-2">
          <span className={`text-(length:--text-base) font-medium ${colorDelNombre}`}>
            {tipo.nombre}
          </span>
          <Badge variant="secondary">{NOMBRE_DE_CLASE[tipo.clase]}</Badge>
          {tipo.activo ? null : <Badge variant="outline">Desactivado</Badge>}
        </span>
        <span className="text-(length:--text-sm) text-(--color-ink-faint)">
          {tipo.conLeads ? 'Tiene leads' : 'Sin leads'}
          {tipo.activo ? '' : ' · no se ofrece en un lead nuevo'}
        </span>
        {unicoActivo ? (
          <span id={idDelMotivo} className="text-(length:--text-sm) text-(--color-ink-soft)">
            Es el único activo de su clase: no se apaga ni se elimina. Crea o activa otro antes.
          </span>
        ) : null}
      </div>
      <label className="order-4 flex min-h-11 items-center gap-2 text-(length:--text-sm) text-(--color-ink-soft) md:order-3 md:min-h-8">
        <Switch
          size="sm"
          aria-label={`${tipo.nombre}: activo`}
          aria-describedby={unicoActivo ? idDelMotivo : undefined}
          title={motivoNoDesactivar ?? undefined}
          checked={tipo.activo}
          disabled={motivoNoDesactivar !== null}
          onCheckedChange={alActivar}
        />
        Activo
      </label>
      <AccionesDeTipo
        tipo={tipo}
        motivo={motivoNoEliminar}
        alEditar={alEditar}
        alPedirEliminar={alPedirEliminar}
      />
    </li>
  )
}
