'use client'

import { GlobeIcon, GlobeLockIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import type { DeLaFila } from '../../../entities/vitrina-rapida'
import { PANEL_DE_VITRINA_RAPIDA } from '../claves'
import { useVitrinaRapida } from '../hooks/use-vitrina-rapida'

// Publicar o sacar de la web con un toque, en la fila o la tarjeta del inventario (con `vehiculos.vitrina` del origen; si no, no está). Sacar y
// publicar lo que ya tiene precio público se hacen ahí, con «Deshacer»; sin precio público, se abre el panel chico para ponerlo
// (`?panel=vitrina-rapida&para=<id>`).
export function BotonDeVitrinaDeLaFila({ vehiculo }: { vehiculo: DeLaFila }) {
  const rapida = useVitrinaRapida()
  const panel = usePanelPorUrl(PANEL_DE_VITRINA_RAPIDA, ['para'])
  const publicado = vehiculo.publicadoWeb
  const etiqueta = publicado
    ? `Sacar «${vehiculo.titulo}» de la web`
    : `Publicar «${vehiculo.titulo}» en la web`
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="size-11 md:size-7"
      aria-label={etiqueta}
      title={etiqueta}
      disabled={rapida.enCurso}
      onClick={() => {
        if (publicado) void rapida.cambiar(vehiculo, false)
        else if (vehiculo.precioWeb === null) panel.abrir({ para: vehiculo.id })
        else void rapida.cambiar(vehiculo, true)
      }}
    >
      {publicado ? <GlobeLockIcon aria-hidden /> : <GlobeIcon aria-hidden />}
    </Button>
  )
}
