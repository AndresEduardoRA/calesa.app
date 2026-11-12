'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { useMencionesDelHilo } from '../hooks/use-menciones-del-hilo'
import { DrawerDeMencionDiferido } from './diferidos'

// El drawer de la mención abierta por la URL: se monta la primera vez que se abre y se queda (se va con su animación).
export function MencionAbierta({ mencion }: { mencion: ReturnType<typeof useMencionesDelHilo> }) {
  const montar = useAbiertoAlgunaVez(mencion.abierta !== null)
  return montar ? (
    <DrawerDeMencionDiferido
      abierta={mencion.abierta}
      menciones={mencion.menciones}
      alCerrar={mencion.cerrar}
    />
  ) : null
}
