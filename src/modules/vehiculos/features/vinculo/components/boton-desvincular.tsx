'use client'

import { UnlinkIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { PANEL_DESVINCULAR } from '../../../entities/vehiculos-del-lead'
import { useVinculo } from '../hooks/use-vinculo'
import { ConfirmarDesvincularDiferido } from './diferidos'

type Props = { vehiculo: { id: string; titulo: string; numero: number; actualizadoEn: string } }

// «Desvincular» en la ficha del vehículo, para quien lo puede editar (la base lo vuelve a decidir). Es la
// salida cuando el vehículo está vinculado a un lead que quien mira no tiene en su cartera. Pregunta
// antes (`?panel=desvincular`): desde acá no hay «Deshacer» (volver a vincular pide la cartera de ese lead).
export function BotonDesvincular({ vehiculo }: Props) {
  const acciones = useVinculo(null)
  const panel = usePanelPorUrl(PANEL_DESVINCULAR)
  const montar = useAbiertoAlgunaVez(panel.abierto)
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="min-h-11 w-fit md:min-h-8"
        disabled={acciones.enCurso}
        onClick={() => {
          panel.abrir()
        }}
      >
        <UnlinkIcon aria-hidden />
        Desvincular
      </Button>
      {montar ? (
        <ConfirmarDesvincularDiferido
          abierto={panel.abierto}
          vehiculo={vehiculo}
          enCurso={acciones.enCurso}
          alCerrar={panel.cerrar}
          alConfirmar={async () => {
            await acciones.desvincular(vehiculo, { deshacer: false })
            panel.cerrar()
          }}
        />
      ) : null}
    </>
  )
}
