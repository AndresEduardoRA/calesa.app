'use client'

import { Badge } from '@/shared/ui/badge'
import { BotonesDeOrden } from '@/shared/ui/lista-de-catalogo/botones-de-orden'
import type { Direccion } from '@/shared/ui/lista-de-catalogo/tipos'
import { MasAcciones } from '@/shared/ui/lista'
import { notasDeRequisito, textoDeBloqueo } from '../../../entities/requisitos/descripcion'
import type { RequisitoParaConfigurar } from '../../../entities/flujo'

type Props = {
  requisito: RequisitoParaConfigurar
  // La descripción humana (C2) ya resuelta con los nombres leídos.
  descripcion: string
  // Para dos fases o dos flujos que no compartan ids de botón: `${prefijo}-${id}-subir`.
  prefijo: string
  puedeSubir: boolean
  puedeBajar: boolean
  alMover: (direccion: Direccion) => void
  alEditar: () => void
  alPedirQuitar: () => void
}

// Un requisito de la fase: su descripción en una línea (con las notas debajo, en gris), «Bloqueante» o «Informativo» con texto (nunca sólo color), el orden
// por botones y el «⋯» con «Editar» y «Quitar». Los botones de orden se apagan en los extremos con su motivo.
export function FilaDeRequisito({
  requisito,
  descripcion,
  prefijo,
  puedeSubir,
  puedeBajar,
  alMover,
  alEditar,
  alPedirQuitar,
}: Props) {
  const notas = notasDeRequisito(requisito)
  return (
    <li className="flex items-center gap-1 rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) py-1 pr-1 pl-3">
      <div className="min-w-0 grow py-1">
        <p className="text-(length:--text-sm) break-words text-(--color-ink)">{descripcion}</p>
        {notas === null ? null : (
          <p className="text-(length:--text-xs) break-words text-(--color-ink-soft)">{notas}</p>
        )}
      </div>
      <Badge variant={requisito.bloqueante ? 'default' : 'secondary'}>
        {textoDeBloqueo(requisito)}
      </Badge>
      <BotonesDeOrden
        prefijo={prefijo}
        id={requisito.id}
        nombre={descripcion}
        puedeSubir={puedeSubir}
        puedeBajar={puedeBajar}
        alMover={alMover}
      />
      <MasAcciones
        nombre={descripcion}
        id={`${prefijo}-${requisito.id}`}
        acciones={[
          {
            tipo: 'accion',
            clave: 'editar',
            etiqueta: 'Editar',
            despuesDeCerrar: true,
            alElegir: alEditar,
          },
          {
            tipo: 'accion',
            clave: 'quitar',
            etiqueta: 'Quitar',
            destructiva: true,
            despuesDeCerrar: true,
            alElegir: alPedirQuitar,
          },
        ]}
      />
    </li>
  )
}
