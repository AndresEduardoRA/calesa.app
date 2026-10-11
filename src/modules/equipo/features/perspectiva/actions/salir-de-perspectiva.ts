'use server'

import { revalidatePath } from 'next/cache'
import { ok } from '@/shared/lib/errores'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { borrarPerspectiva } from '../cookie'

// Volver a ver la app con los permisos propios. No pide ningún permiso: salir siempre se puede.
export const salirDePerspectiva = actionClient.action(async () => {
  await borrarPerspectiva()
  revalidatePath(RUTAS.inicio, 'layout')
  return ok(null)
})
