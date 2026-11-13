'use client'

import { Button } from '@/shared/ui/button'
import { Aviso } from '@/shared/ui/aviso'
import type { ArchivoEnMemoria } from '../../../entities/informe-de-importacion'
import {
  DIAS_DEL_INFORME,
  rechazadasDe,
  type ResumenDeImportacion,
} from '../../../entities/resumen-de-importacion'
import { useDescargaDeRechazadas } from '../hooks/use-descarga-de-rechazadas'

type Props = {
  resumen: ResumenDeImportacion
  ahora: number
  // El archivo de la persona, sólo en el asistente que la lanzó: así cada rechazada lleva sus celdas (D54).
  archivo: ArchivoEnMemoria | null
}

// «Descargar las rechazadas» de una importación terminada o fallida con alguna, mientras la base guarda el informe (30 días).
export function BotonDeRechazadas({ resumen, ahora, archivo }: Props) {
  const descarga = useDescargaDeRechazadas()
  const cuales = rechazadasDe(resumen, ahora)
  if (cuales === 'ninguna') return null
  if (cuales === 'vencidas') {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        El detalle por fila se guarda {DIAS_DEL_INFORME} días.
      </p>
    )
  }
  return (
    <div className="grid justify-items-start gap-2">
      <Button
        type="button"
        variant="outline"
        className="h-11 md:h-9"
        disabled={descarga.descargando}
        onClick={() => {
          descarga.descargar(resumen, archivo)
        }}
      >
        {descarga.descargando ? 'Descargando…' : 'Descargar las rechazadas'}
      </Button>
      {descarga.error ? <Aviso tono="peligro">{descarga.error}</Aviso> : null}
    </div>
  )
}
