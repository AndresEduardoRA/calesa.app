'use client'

import type { Tono } from '@/shared/ui/xcell'
import type { Diseno } from '../../../entities/diseno'
import type { DisenoParaEditar } from '../../../entities/diseno/edicion-del-diseno'
import { useVistaPreviaDelDiseno } from '../hooks/use-vista-previa-del-diseno'
import { ControlesDeLaVistaPrevia } from './controles-de-la-vista-previa'
import { VistaPreviaDelDisenoDiferido } from './diferidos'

type Props = {
  origen: { id: string; nombre: string }
  trabajo: Diseno
  leida: DisenoParaEditar
  tonos: readonly Tono[]
}

// «Vista previa» del editor del diseño (4.22-5): los controles y, abierta (`?vista=`), la hoja dibujada con el diseño en edición. Su código se pide al abrirla.
export function PanelDeLaVistaPrevia({ origen, trabajo, leida, tonos }: Props) {
  const vista = useVistaPreviaDelDiseno()
  return (
    <>
      <ControlesDeLaVistaPrevia
        ancho={vista.ancho}
        alAlternar={vista.alternar}
        alElegir={vista.elegir}
      />
      {vista.ancho === null ? null : (
        <VistaPreviaDelDisenoDiferido
          origen={origen}
          trabajo={trabajo}
          leida={leida}
          tonos={tonos}
          ancho={vista.ancho}
        />
      )}
    </>
  )
}
