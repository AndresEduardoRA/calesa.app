'use client'

import { Button } from '@/shared/ui/button'
import {
  ANCHOS_DE_LA_VISTA_PREVIA,
  type AnchoDeLaVistaPrevia,
} from '../../../entities/diseno/anchos-de-la-vista-previa'

const TEXTO_DEL_ANCHO: Record<AnchoDeLaVistaPrevia, string> = {
  '412': '412 px',
  '1280': '1.280 px',
  '200': '200 %',
}

type Props = {
  // El ancho elegido; nulo: la vista previa está cerrada.
  ancho: AnchoDeLaVistaPrevia | null
  alAlternar: () => void
  alElegir: (ancho: AnchoDeLaVistaPrevia) => void
}

// «Vista previa» abre y cierra el panel (interruptor) y, abierto, elige a qué ancho se dibuja la hoja: el celular, el escritorio o el celular con el texto al 200 %.
export function ControlesDeLaVistaPrevia({ ancho, alAlternar, alElegir }: Props) {
  return (
    <div data-controles-de-la-vista-previa="" className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        className="min-h-11 md:min-h-8"
        aria-expanded={ancho !== null}
        aria-controls="vista-previa-del-diseno"
        onClick={alAlternar}
      >
        Vista previa
      </Button>
      {ancho === null ? null : (
        <div role="group" aria-label="Ancho de la vista previa" className="flex flex-wrap gap-2">
          {ANCHOS_DE_LA_VISTA_PREVIA.map((opcion) => (
            <Button
              key={opcion}
              variant={opcion === ancho ? 'secondary' : 'outline'}
              className="min-h-11 md:min-h-8"
              aria-pressed={opcion === ancho}
              onClick={() => {
                alElegir(opcion)
              }}
            >
              {TEXTO_DEL_ANCHO[opcion]}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
