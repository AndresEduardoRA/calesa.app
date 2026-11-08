'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useAperturaDeLaTarjeta } from '../hooks/use-apertura-de-la-tarjeta'
import type { PanelDeLaTarjeta } from '../hooks/use-panel-de-la-tarjeta'
import { DescartarLaPlantillaDiferido, ModalDePublicarLaTarjetaDiferido } from './diferidos'

type Props = {
  panel: PanelDeLaTarjeta
  origen: { id: string; nombre: string }
  // El `actualizadoEn` del borrador que la pestaña leyó (nulo sin borrador).
  esperada: string | null
}

// Los modales de la pestaña «Tarjeta» (4.19-3c: publicar y descartar), montados al abrirse por primera vez y con una `key` por apertura. Aquí sólo se revisa al llegar por la URL (sin borrador
// no abre); lo que cambia con el modal abierto (tras «Recargar»: el borrador ya no está o es otro) lo dice el modal.
export function AccionesDeLaPlantilla({ panel, origen, esperada }: Props) {
  const { apertura, publicando, descartando, aDescartar } = useAperturaDeLaTarjeta(panel, esperada)
  const montarPublicar = useAbiertoAlgunaVez(publicando)
  const montarDescartar = useAbiertoAlgunaVez(descartando)
  return (
    <>
      {montarPublicar ? (
        <ModalDePublicarLaTarjetaDiferido
          key={apertura}
          abierto={publicando}
          alCerrar={panel.cerrar}
          origen={origen}
          esperada={esperada}
        />
      ) : null}
      {montarDescartar && aDescartar ? (
        <DescartarLaPlantillaDiferido
          key={apertura}
          abierto={descartando}
          alCerrar={panel.cerrar}
          origen={origen}
          esperada={esperada}
          nombrado={aDescartar}
        />
      ) : null}
    </>
  )
}
