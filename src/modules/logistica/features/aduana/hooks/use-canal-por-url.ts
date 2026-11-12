'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { PANEL_CANAL, MENSAJE_DECLARACION_YA_NO_ESTA } from '../../../entities/aduana/paneles'

export const MENSAJE_SIN_VEHICULOS_PARA_EL_CANAL =
  'Agrega al menos un vehículo antes de asignar el canal.'

// La confirmación de asignar el canal en la URL (`?panel=canal&declaracion=<id>`): se puede recargar y «atrás» la cierra. Va sobre el resumen, que ya ocupa `?declaracion=`: abrir y cerrar
// sólo tocan `?panel=` y el resumen se queda. Sin permiso de gestionar, o sin vehículos (la base lo exige), no abre: se avisa y la URL se limpia, una vez.
export function useCanalPorUrl(args: { puedeGestionar: boolean; hayVehiculos: boolean }) {
  const url = usePanelPorUrl(PANEL_CANAL)
  const apertura = useApertura(url.abierto)
  const motivo = !args.puedeGestionar
    ? MENSAJE_DECLARACION_YA_NO_ESTA
    : args.hayVehiculos
      ? null
      : MENSAJE_SIN_VEHICULOS_PARA_EL_CANAL
  const rechazada = useRevisionAlAbrir(url.abierto ? String(apertura) : null, motivo, url.cerrar)
  return {
    abierto: url.abierto && !rechazada,
    abrir: () => {
      url.abrir()
    },
    cerrar: url.cerrar,
  }
}
