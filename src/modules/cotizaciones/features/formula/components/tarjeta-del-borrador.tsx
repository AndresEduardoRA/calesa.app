'use client'

import { fechaRelativa } from '@/shared/lib/fechas'
import { useRegional } from '@/shared/ui/regional'
import {
  borradorAtrasado,
  type BorradorDelOrigen,
  type ConAutor,
  type PublicadaDelOrigen,
} from '../../../entities/formula/versiones'

type Props = {
  borrador: ConAutor<BorradorDelOrigen>
  publicada: Pick<PublicadaDelOrigen, 'id' | 'version'> | null
}

// El borrador del origen (a lo sumo uno): quién lo guardó, cuándo, sobre qué versión empezó y, si desde entonces se publicó otra, que publicarlo dará conflicto
// (4.20-1: la base lo rechaza con quién publicó). Publicarlo o descartarlo es del 4.20-2b.
export function TarjetaDelBorrador({ borrador, publicada }: Props) {
  const { zonaHoraria } = useRegional()
  const atrasado = borradorAtrasado(borrador, publicada)
  return (
    <section
      aria-label="Borrador"
      className="grid gap-1 rounded-(--radius-lg) border border-(--color-line) bg-(--color-surface) p-3 text-(length:--text-sm)"
    >
      <h3 className="font-semibold text-(--color-ink)">
        Borrador de {borrador.autor} · guardado{' '}
        {fechaRelativa(borrador.actualizadoEn, { zona: zonaHoraria })}
      </h3>
      {borrador.nota ? <p className="break-words text-(--color-ink)">{borrador.nota}</p> : null}
      {borrador.versionDeOrigen !== null ? (
        <p className="text-(--color-ink-soft)">
          Empezó sobre la versión {borrador.versionDeOrigen}.
        </p>
      ) : null}
      {atrasado && publicada ? (
        <p className="rounded-(--radius-md) bg-(--color-aviso-soft) p-2 text-(--color-aviso-ink)">
          Después de que empezó, se publicó la versión {publicada.version}: publicarlo dará
          conflicto.
        </p>
      ) : null}
    </section>
  )
}
