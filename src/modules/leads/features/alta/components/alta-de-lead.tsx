'use client'

import { PlusIcon } from 'lucide-react'
import { useAtajo } from '@/shared/ui/atajos'
import { Button } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelDeAlta } from '../hooks/use-panel-de-alta'
import { AltaConDatos, adelantarElAlta } from './diferidos'
import { MarcoDelAlta } from './marco-del-alta'

// «Nuevo lead»: el botón de la barra superior, la tecla N y el drawer (`?panel=nuevo-lead`), desde
// cualquier pantalla. Sólo se monta con `leads.crear`: sin él no hay botón, ni atajo, ni URL que
// abra nada. Acá vive sólo lo que hace falta para abrirlo: el marco (el único drawer, cerrado hasta que se pide) y, de ahí, lo demás
// (incluida la lectura del contexto del alta, que ya no viaja con el documento de cada pantalla) llega con el primer clic, la primera
// `N` o una URL que ya lo trae abierto.
//
// `N` abre «Nuevo lead» donde la pantalla no tiene un «nuevo» propio: de respaldo mientras está
// cerrado (una pantalla que registra el suyo gana). Con el drawer abierto responde de verdad, y no
// hace nada: ninguna otra `N` se cuela.
export function AltaDeLead() {
  const panel = usePanelDeAlta()
  const montado = useAbiertoAlgunaVez(panel.abierto)
  useAtajo(
    'nuevo',
    () => {
      if (!panel.abierto) {
        adelantarElAlta()
        panel.abrir()
      }
    },
    true,
    { respaldo: !panel.abierto },
  )
  return (
    <>
      <Button
        size="sm"
        aria-label="Nuevo lead"
        onClick={panel.abrir}
        onPointerEnter={adelantarElAlta}
        onFocus={adelantarElAlta}
        aria-keyshortcuts="N"
      >
        <PlusIcon aria-hidden />
        <span className="hidden sm:inline">Nuevo lead</span>
      </Button>
      <MarcoDelAlta>{montado ? <AltaConDatos /> : null}</MarcoDelAlta>
    </>
  )
}
