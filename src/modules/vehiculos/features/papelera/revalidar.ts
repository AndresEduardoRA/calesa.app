import 'server-only'
import { revalidatePath } from 'next/cache'
import { RUTAS } from '@/shared/lib/rutas'

// Lo que entra o sale de la papelera cambia el inventario, la ficha de cada vehículo y la
// papelera misma: todo cuelga de `/vehiculos`.
export function revalidarInventario(): void {
  revalidatePath(RUTAS.vehiculos, 'layout')
}
