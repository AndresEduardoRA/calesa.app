'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import { motivoParaNoAbrirDescartar } from '../../../entities/plantilla/descartar-la-plantilla'
import { motivoParaNoAbrirPublicar } from '../../../entities/plantilla/publicar-la-plantilla'
import type { PanelDeLaTarjeta } from './use-panel-de-la-tarjeta'

type Modo = 'publicar' | 'descartar' | null

function modoDe(panel: PanelDeLaTarjeta): Modo {
  if (panel.publicando) return 'publicar'
  return panel.descartando ? 'descartar' : null
}

// Qué modal de la pestaña «Tarjeta» abre según la URL. Se revisa una vez, al llegar: publicar o descartar sin borrador no abre, se avisa y la URL se limpia. Lo que cambia
// con el modal abierto (otra persona publicó o descartó) no lo cierra: lo dicen el modal y el diálogo. El borrador que se nombra se fija al abrir (`useUltimo`): tras
// descartarlo, el diálogo que se va sigue nombrando lo mismo.
export function useAperturaDeLaTarjeta(panel: PanelDeLaTarjeta, esperada: string | null) {
  const modo = modoDe(panel)
  const apertura = useApertura(modo !== null)
  const motivo =
    modo === 'publicar'
      ? motivoParaNoAbrirPublicar(esperada)
      : modo === 'descartar'
        ? motivoParaNoAbrirDescartar(esperada)
        : null
  const rechazada = useRevisionAlAbrir(
    modo === null ? null : `${String(apertura)}:${modo}`,
    motivo,
    panel.cerrar,
  )
  const aDescartar = useUltimo(modo === 'descartar' ? esperada : null)
  return {
    apertura,
    publicando: modo === 'publicar' && !rechazada,
    descartando: modo === 'descartar' && !rechazada && esperada !== null,
    aDescartar,
  }
}
