'use client'

import { CalendarClockIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/shared/ui/button'
import { diferido } from '@/shared/ui/diferido'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import type { FechasDeSubasta } from '../../../entities/fechas-de-subasta'

// El formulario se pide recién al abrirse: la ficha no carga su código para mostrarse.
const ModalDeFechasDeSubastaDiferido = diferido(() =>
  import('./modal-de-fechas-de-subasta').then((modulo) => modulo.ModalDeFechasDeSubasta),
)

export const PANEL_DE_FECHAS_DE_SUBASTA = 'fechas-de-subasta'

type Props = {
  vehiculoId: string
  actualizadoEn: string
  fechas: FechasDeSubasta
  ahora: string
}

// «Editar fechas» en el bloque de la subasta (A4b), para quien puede editar el vehículo.
export function EditarFechasDeSubasta({ vehiculoId, actualizadoEn, fechas, ahora }: Props) {
  const panel = usePanelPorUrl(PANEL_DE_FECHAS_DE_SUBASTA)
  const montado = useAbiertoAlgunaVez(panel.abierto)
  const [apertura, setApertura] = useState(0)
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setApertura((antes) => antes + 1)
          panel.abrir()
        }}
      >
        <CalendarClockIcon aria-hidden />
        Editar fechas
      </Button>
      {montado ? (
        <ModalDeFechasDeSubastaDiferido
          key={apertura}
          abierto={panel.abierto}
          alCerrar={panel.cerrar}
          vehiculoId={vehiculoId}
          actualizadoEn={actualizadoEn}
          fechas={fechas}
          ahora={ahora}
        />
      ) : null}
    </>
  )
}
