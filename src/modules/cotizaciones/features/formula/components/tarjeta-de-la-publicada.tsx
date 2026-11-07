'use client'

import { fechaRelativa } from '@/shared/lib/fechas'
import { Button } from '@/shared/ui/button'
import { useRegional } from '@/shared/ui/regional'
import type { ConAutor, PublicadaDelOrigen } from '../../../entities/formula/versiones'

type Props = {
  publicada: ConAutor<PublicadaDelOrigen> | null
  // El nombre del origen, para decir que sin publicada no se cotiza en él.
  origen: string
  // Sin borrador, abre el editor sobre la publicada (`?panel=editar-formula`, 4.21-3a-1): lo que se aplique será un borrador nuevo.
  alEditar?: () => void
}

// La versión con la que hoy se cotiza en el origen. Sin ella, la «fórmula pendiente» del glosario: no se puede cotizar.
export function TarjetaDeLaPublicada({ publicada, origen, alEditar }: Props) {
  const { zonaHoraria } = useRegional()
  if (!publicada) {
    return (
      <section
        aria-label="Publicada"
        className="rounded-(--radius-lg) border border-(--color-line) bg-(--color-surface) p-3 text-(length:--text-sm) text-(--color-ink)"
      >
        {origen} todavía no tiene una versión publicada: no se puede cotizar en él.
      </section>
    )
  }
  return (
    <section
      aria-label="Publicada"
      className="grid gap-1 rounded-(--radius-lg) border border-(--color-line) bg-(--color-surface) p-3 text-(length:--text-sm)"
    >
      <h3 className="font-semibold text-(--color-ink)">Publicada: versión {publicada.version}</h3>
      {publicada.nota ? <p className="break-words text-(--color-ink)">{publicada.nota}</p> : null}
      <p className="text-(--color-ink-soft)">
        {publicada.autor}
        {publicada.publicadoEn
          ? ` · ${fechaRelativa(publicada.publicadoEn, { zona: zonaHoraria })}`
          : null}
      </p>
      {alEditar ? (
        <div className="mt-1 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 md:min-h-9"
            onClick={alEditar}
          >
            Editar en un borrador
          </Button>
        </div>
      ) : null}
    </section>
  )
}
