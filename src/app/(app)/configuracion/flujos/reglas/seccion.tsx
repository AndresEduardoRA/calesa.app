import { Suspense } from 'react'
import { EsqueletoDeReglas, PantallaDeReglas } from '@/modules/flujos/pantallas/reglas'
import { getOrigenes } from '@/modules/origenes'
import type { SeccionDeFlujos } from '../pestanas'

// Lo que dibuja cada pestaña del área `reglas`, por su clave (5.11). Se lee detrás de `<Suspense>` y se reinicia al cambiar de flujo (`key`).
export const SECCIONES_DE_REGLAS: Record<string, SeccionDeFlujos> = {
  reglas: (pedido) => (
    <Suspense
      key={`${pedido.origenPedido ?? ''}:${pedido.ambitoPedido ?? ''}`}
      fallback={<EsqueletoDeReglas />}
    >
      <PantallaDeReglas
        permisos={pedido.permisos}
        origenes={getOrigenes(true)}
        origenPedido={pedido.origenPedido}
        ambitoPedido={pedido.ambitoPedido}
      />
    </Suspense>
  ),
}
