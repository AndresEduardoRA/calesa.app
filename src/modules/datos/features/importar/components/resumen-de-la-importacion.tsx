'use client'

import { Aviso } from '@/shared/ui/aviso'
import { Badge } from '@/shared/ui/badge'
import { useRegional } from '@/shared/ui/regional'
import type { ArchivoEnMemoria } from '../../../entities/informe-de-importacion'
import {
  estadoVisible,
  ETIQUETA_DE_ESTADO,
  fraseDelAvance,
  TONO_DE_ESTADO,
  type ResumenDeImportacion,
} from '../../../entities/resumen-de-importacion'
import { BotonDeRechazadas } from './boton-de-rechazadas'

type Props = {
  // Nulo hasta la primera lectura de la base.
  resumen: ResumenDeImportacion | null
  ahora: number
  avisoDelSondeo: string | null
  archivo: ArchivoEnMemoria | null
}

// La importación recién lanzada, en el paso «Importando» (9.06-5): su estado, el avance leído de la base y, al terminar, el resultado y las
// rechazadas con las celdas de la persona. Es una región con nombre: la lista «Importaciones» de abajo repite la frase.
export function ResumenDeLaImportacion({ resumen, ahora, avisoDelSondeo, archivo }: Props) {
  const { locale } = useRegional()
  const estado = resumen ? estadoVisible(resumen, ahora) : null
  return (
    <section role="region" aria-label="Importación en curso" className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {estado ? (
          <Badge variant={TONO_DE_ESTADO[estado]}>{ETIQUETA_DE_ESTADO[estado]}</Badge>
        ) : null}
        <p aria-live="polite" className="text-(length:--text-sm)">
          {resumen
            ? fraseDelAvance(resumen, ahora, locale)
            : 'La importación empezó: puedes seguir en otra pantalla.'}
        </p>
      </div>
      {resumen && estado !== 'terminada' && estado !== 'fallida' ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Puedes seguir en otra pantalla: la importación sigue sola.
        </p>
      ) : null}
      {avisoDelSondeo ? <Aviso tono="aviso">{avisoDelSondeo}</Aviso> : null}
      {resumen ? <BotonDeRechazadas resumen={resumen} ahora={ahora} archivo={archivo} /> : null}
    </section>
  )
}
