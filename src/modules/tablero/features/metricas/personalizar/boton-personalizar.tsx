'use client'

import { SlidersHorizontalIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { PanelDePersonalizarDiferido } from './diferidos'
import type { WidgetOfrecido } from './tipos'

type Props = {
  // Lo que la persona puede ver, en su orden y con lo oculto en su lugar: lo arma el servidor con sus permisos.
  ofrecidos: readonly WidgetOfrecido[]
  // Hay algo guardado que «Restablecer» puede borrar.
  hayPreferencia: boolean
  // Las claves en el orden del catálogo, para «Restablecer».
  ordenDeFabrica: readonly string[]
}

// «Personalizar» en la cabecera de `/tablero`: abre el panel por la URL (`?panel=personalizar`, que deja el período como está).
export function BotonPersonalizar({ ofrecidos, hayPreferencia, ordenDeFabrica }: Props) {
  const panel = usePanelPorUrl('personalizar')
  const montar = useAbiertoAlgunaVez(panel.abierto)
  return (
    <>
      <Button variant="outline" className="min-h-11 md:min-h-9" onClick={() => panel.abrir()}>
        <SlidersHorizontalIcon aria-hidden />
        Personalizar
      </Button>
      {montar ? (
        <PanelDePersonalizarDiferido
          abierto={panel.abierto}
          alCerrar={panel.cerrar}
          ofrecidos={ofrecidos}
          hayPreferencia={hayPreferencia}
          ordenDeFabrica={ordenDeFabrica}
        />
      ) : null}
    </>
  )
}
