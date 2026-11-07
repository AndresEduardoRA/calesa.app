'use client'

import { fechaRelativa } from '@/shared/lib/fechas'
import { useRegional } from '@/shared/ui/regional'
import { BotonesDelBorrador } from './botones-del-borrador'
import {
  borradorAtrasado,
  type BorradorDelOrigen,
  type ConAutor,
  type PublicadaDelOrigen,
} from '../../../entities/formula/versiones'

type Props = {
  borrador: ConAutor<BorradorDelOrigen>
  publicada: Pick<PublicadaDelOrigen, 'id' | 'version'> | null
  // Abre «Publicar el borrador» (`?panel=publicar-formula`). Sin él, la tarjeta sólo se lee.
  alPublicar?: () => void
  // Abre «Descartar el borrador» (`?panel=descartar-borrador`, 4.20-2c), también atrasado.
  alDescartar?: () => void
  // Abre el editor sobre el borrador (`?panel=editar-formula`, 4.21-3a-1), también atrasado.
  alEditar?: () => void
}

// El borrador del origen (a lo sumo uno): quién lo guardó, cuándo, sobre qué versión empezó y, si desde entonces se publicó otra, que publicarlo dará conflicto
// (4.20-1: la base lo rechaza con quién publicó). «Publicar…» sólo al día (4.20-2b): atrasado, el aviso ya dice por qué no. «Descartar…» siempre (4.20-2c): un borrador
// atrasado ya no se publica, y se descarta. «Editar» abre el editor en texto sobre él (4.21-3a-1).
export function TarjetaDelBorrador({
  borrador,
  publicada,
  alPublicar,
  alDescartar,
  alEditar,
}: Props) {
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
      <BotonesDelBorrador
        {...(alEditar ? { alEditar } : {})}
        {...(alPublicar && !atrasado ? { alPublicar } : {})}
        {...(alDescartar ? { alDescartar } : {})}
      />
    </section>
  )
}
