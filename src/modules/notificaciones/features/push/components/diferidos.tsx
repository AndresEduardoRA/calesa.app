'use client'

import { diferido } from '@/shared/ui/diferido'
import { Skeleton } from '@/shared/ui/skeleton'

// El código del push (el hook, la lista y los interruptores) se pide al llegar a `/perfil`, no viaja en su JS en frío.
export const SeccionDeNotificacionesDiferida = diferido(
  () => import('./seccion-de-notificaciones').then((modulo) => modulo.SeccionDeNotificaciones),
  { esqueleto: <Skeleton className="h-40 w-full" />, aviso: 'aqui' },
)
