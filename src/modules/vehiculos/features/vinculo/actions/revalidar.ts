import 'server-only'
import { revalidatePath } from 'next/cache'
import { RUTAS } from '@/shared/lib/rutas'

// El vínculo y el interés se ven en la ficha del lead y en la del vehículo: se vuelven a dibujar las
// dos (y el listado de vehículos, que sabe qué se puede enviar a la papelera).
export function revalidarVinculo(): void {
  revalidatePath(`${RUTAS.leads}/[id]`, 'page')
  revalidatePath(`${RUTAS.vehiculos}/[id]`, 'page')
  revalidatePath(RUTAS.vehiculos)
}
