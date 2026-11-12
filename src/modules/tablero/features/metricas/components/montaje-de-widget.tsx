import { connection } from 'next/server'
import type { Permisos } from '@/shared/lib/permisos'
import type { VentanaDelPeriodo } from '../../../entities/periodo'
import type { WidgetParaMontar } from '../widgets/registro'

// Lee la sesión y la base: por eso va tras `connection()` y dentro del `<Suspense>` de su widget.
export async function MontajeDeWidget({
  montaje: { widget, cuerpo: Cuerpo },
  ventana,
  permisos,
}: {
  montaje: WidgetParaMontar
  ventana: VentanaDelPeriodo
  permisos: Permisos
}) {
  await connection()
  return <Cuerpo widget={widget} ventana={ventana} permisos={permisos} />
}
