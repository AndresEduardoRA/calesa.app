'use client'

import { PlusIcon } from 'lucide-react'
import { useAtajo } from '@/shared/ui/atajos'
import { Button } from '@/shared/ui/button'
import { diferido } from '@/shared/ui/diferido'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { ContextoDeAlta } from '../../../entities/alta'
import type { CampoDeLead } from '../../../entities/campo'
import { usePanelDeAlta } from '../hooks/use-panel-de-alta'

type Props = {
  contexto: ContextoDeAlta
  // Todo el layout de los leads: acá sólo cuentan los activos.
  campos: readonly CampoDeLead[]
}

// El drawer con todo lo suyo (el estado del alta, los campos, el redactor) se pide la primera vez que
// se abre: el shell lo monta en **todas** las pantallas y no puede cargarlo para dibujar un botón.
const AltaCargada = diferido<Props>(() => import('./alta-cargada').then((m) => m.AltaCargada))

// «Nuevo lead»: el botón de la barra superior, la tecla N y el drawer (`?panel=nuevo-lead`), desde
// cualquier pantalla. Sólo se monta con `leads.crear`: sin él no hay botón, ni atajo, ni URL que
// abra nada. Acá vive sólo lo que hace falta para abrirlo; lo demás llega con el primer clic, la
// primera `N` o una URL que ya lo trae abierto.
//
// `N` abre «Nuevo lead» donde la pantalla no tiene un «nuevo» propio: de respaldo mientras está
// cerrado, porque esta alta hidrata detrás de su propio Suspense y, sin eso, taparía al de la
// pantalla. Con el drawer abierto responde de verdad, y no hace nada: ninguna otra `N` se cuela.
export function AltaDeLead({ contexto, campos }: Props) {
  const panel = usePanelDeAlta()
  const montado = useAbiertoAlgunaVez(panel.abierto)
  useAtajo(
    'nuevo',
    () => {
      if (!panel.abierto) {
        panel.abrir()
      }
    },
    true,
    { respaldo: !panel.abierto },
  )
  return (
    <>
      <Button size="sm" aria-label="Nuevo lead" onClick={panel.abrir} aria-keyshortcuts="N">
        <PlusIcon aria-hidden />
        <span className="hidden sm:inline">Nuevo lead</span>
      </Button>
      {montado ? <AltaCargada contexto={contexto} campos={campos} /> : null}
    </>
  )
}
