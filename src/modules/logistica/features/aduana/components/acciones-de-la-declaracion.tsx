'use client'

import { Button } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { DeclaracionLeida } from '../../../entities/aduana/declaracion'
import { useAsignarElCanal } from '../hooks/use-asignar-el-canal'
import { MENSAJE_SIN_VEHICULOS_PARA_EL_CANAL, useCanalPorUrl } from '../hooks/use-canal-por-url'
import { usePanelDeDeclaracion } from '../hooks/use-panel-de-declaracion'
import { ConfirmarAsignarCanalDiferido } from './diferidos'

// Los botones de escribir del resumen (sólo con `logistica.aduana.gestionar`, la base lo vuelve a exigir): «Editar» y «Asignar canal» / «Cambiar canal». Sin vehículos el canal no se
// asigna y el botón lo dice (la base lo exige). La confirmación se pide al usarse (`diferido()`).
export function AccionesDeLaDeclaracion({ declaracion }: { declaracion: DeclaracionLeida }) {
  const panel = usePanelDeDeclaracion()
  const hayVehiculos = declaracion.vehiculos.length > 0
  const canal = useCanalPorUrl({ puedeGestionar: true, hayVehiculos })
  const asignar = useAsignarElCanal(declaracion)
  const montar = useAbiertoAlgunaVez(canal.abierto)
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          className="h-11 md:h-9"
          onClick={() => {
            panel.abrirEdicion(declaracion.id)
          }}
        >
          Editar
        </Button>
        <Button
          variant="outline"
          className="h-11 md:h-9"
          disabled={!hayVehiculos}
          onClick={canal.abrir}
        >
          {declaracion.canal ? 'Cambiar canal' : 'Asignar canal'}
        </Button>
      </div>
      {hayVehiculos ? null : (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          {MENSAJE_SIN_VEHICULOS_PARA_EL_CANAL}
        </p>
      )}
      {montar ? (
        <ConfirmarAsignarCanalDiferido
          declaracion={declaracion}
          abierto={canal.abierto}
          asignar={asignar}
          alCerrar={canal.cerrar}
        />
      ) : null}
    </div>
  )
}
