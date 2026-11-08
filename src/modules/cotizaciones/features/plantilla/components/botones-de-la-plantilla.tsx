'use client'

import { Button } from '@/shared/ui/button'
import { motivoParaNoPublicar } from '../../../entities/plantilla/publicar-la-plantilla'

type Props = {
  // El `actualizadoEn` del borrador leído: nulo, no hay borrador.
  esperada: string | null
  // Lo que se ve en el editor no es lo guardado.
  hayCambios: boolean
  // Guardando, recargando o con un conflicto del guardado: nada se pide ahora.
  ocupado: boolean
  alPublicar: () => void
  alDescartar: () => void
}

export const ID_DEL_MOTIVO_DE_PUBLICAR = 'tarjeta-motivo-de-publicar'

// «Publicar…» y «Descartar borrador…» (4.19-3c), en la fila de «Guardar»: viven en el editor porque saben si hay cambios sin guardar. «Publicar…» se apaga con su motivo
// **escrito a la vista** (no sólo en un `title`): sin borrador, o con cambios sin guardar (se publica lo guardado, no lo que se ve). No se apaga por «Con esto no se
// podría publicar»: el contexto del navegador es reducido y decide la base, cuyo rechazo vuelve al modal. «Descartar borrador…» sólo existe con borrador, también con
// cambios sin guardar. El permiso es el de la pestaña (`cotizaciones.configurar` del origen); la action y la base lo vuelven a pedir.
export function BotonesDeLaPlantilla({
  esperada,
  hayCambios,
  ocupado,
  alPublicar,
  alDescartar,
}: Props) {
  const motivo = motivoParaNoPublicar({ esperada, hayCambios })
  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 md:min-h-9"
        disabled={ocupado || motivo !== null}
        aria-describedby={motivo === null ? undefined : ID_DEL_MOTIVO_DE_PUBLICAR}
        onClick={alPublicar}
      >
        Publicar…
      </Button>
      {esperada === null ? null : (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 md:min-h-9"
          disabled={ocupado}
          onClick={alDescartar}
        >
          Descartar borrador…
        </Button>
      )}
      {motivo === null ? null : (
        <p
          id={ID_DEL_MOTIVO_DE_PUBLICAR}
          className="basis-full text-(length:--text-sm) text-(--color-ink-soft)"
        >
          {motivo}
        </p>
      )}
    </>
  )
}
