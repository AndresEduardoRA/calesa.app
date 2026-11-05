'use client'

import { useState } from 'react'
import { Drawer } from '@/shared/ui/drawer'
import type { ContextoDeHoja } from '../../../entities/binding'
import type { CeldaDeHoja, SeccionDeHoja } from '../../../entities/hoja'
import { ayudaDeTexto, celdaConAyuda } from '../../../entities/presentacion-de-la-hoja'
import type { AyudaAbierta } from '../hooks/use-ayuda-de-la-hoja'
import { botonDeAyuda } from './boton-de-ayuda'

type Props = {
  // Las secciones donde se busca la celda que nombra la URL: la ayuda de una celda del modal se abre dentro del modal, la de la hoja en la hoja.
  secciones: readonly SeccionDeHoja[]
  contexto: ContextoDeHoja
  ayuda: AyudaAbierta
}

// La ayuda de texto de una celda (paso 4.13-4a): un panel de sólo lectura con el texto del diseño, con su URL. Si la URL nombra una celda que estas secciones no dibujan o que
// no tiene ayuda de texto, no abre nada. Al cerrar, el foco vuelve al botón de ayuda de su celda, también si se abrió por la URL.
export function AyudaDeCelda({ secciones, contexto, ayuda }: Props) {
  const celda = celdaConAyuda(secciones, ayuda.nodo, 'texto', contexto)
  // La celda se recuerda mientras el panel se va: sin ella se vaciaría a media animación.
  const [ultima, setUltima] = useState<CeldaDeHoja | null>(null)
  if (celda !== null && celda !== ultima) {
    setUltima(celda)
  }
  const mostrada = celda ?? ultima
  if (mostrada === null) {
    return null
  }
  return (
    <Drawer
      abierto={celda !== null}
      alCerrar={ayuda.cerrar}
      titulo={`Ayuda de ${mostrada.etiqueta}`}
      focoAlCerrar={() => botonDeAyuda(mostrada)}
    >
      <p className="text-(length:--text-base) break-words whitespace-pre-line text-(--color-ink)">
        {ayudaDeTexto(mostrada)}
      </p>
    </Drawer>
  )
}
