'use client'

import { formatearFecha, formatearHora } from '@/shared/lib/fechas'
import { Drawer } from '@/shared/ui/drawer'
import { useRegional } from '@/shared/ui/regional'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { etiquetaDeEntidad, nombreDelActor, verboDeLaAccion } from '../../../entities/etiquetas'
import type { useCambioAbierto } from '../hooks/use-cambio-abierto'
import { useDiff } from '../hooks/use-diff'
import { CuerpoDelCambioDiferido } from './diferidos'

type Props = { cambio: ReturnType<typeof useCambioAbierto> }

// El diff de un cambio de la actividad (`?cambio=<id>`), de sólo lectura. Montado siempre y cerrado hasta abrirse; el cuerpo llega con
// `diferido()`. El título es fijo para que no salte mientras lee; la descripción (verbo, entidad, persona y hora) llega con la lectura.
export function DrawerDeCambio({ cambio }: Props) {
  const { zonaHoraria } = useRegional()
  const { lectura, reintentar } = useDiff(cambio.abierto, cambio.id)
  const montar = useAbiertoAlgunaVez(cambio.abierto)
  const diff = lectura.estado === 'listo' && lectura.diff.visible ? lectura.diff : null
  return (
    <Drawer
      abierto={cambio.abierto}
      alCerrar={cambio.cerrar}
      titulo="Detalle del cambio"
      descripcion={
        diff === null
          ? undefined
          : `${verboDeLaAccion(diff.accion)} · ${etiquetaDeEntidad(diff.tabla)} · ${nombreDelActor(diff)} · ${formatearFecha(diff.creadoEn, { zona: zonaHoraria })} ${formatearHora(diff.creadoEn, { zona: zonaHoraria })}`
      }
    >
      {montar ? <CuerpoDelCambioDiferido lectura={lectura} reintentar={reintentar} /> : null}
    </Drawer>
  )
}
