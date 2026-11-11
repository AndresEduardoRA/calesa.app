import { Suspense } from 'react'
import { EsqueletoDeTipos, PantallaDeDocumentos } from '@/modules/flujos/pantallas/documentos'
import { getOrigenes } from '@/modules/origenes'
import type { SeccionDeFlujos } from '../pestanas'

// Lo que dibuja cada pestaña del área `documentos`, por su clave (5.09). Se lee detrás de `<Suspense>` y se reinicia al cambiar de flujo (`key`).
export const SECCIONES_DE_DOCUMENTOS: Record<string, SeccionDeFlujos> = {
  documentos: (pedido) => (
    <Suspense
      key={`${pedido.origenPedido ?? ''}:${pedido.ambitoPedido ?? ''}`}
      fallback={<EsqueletoDeTipos />}
    >
      <PantallaDeDocumentos
        permisos={pedido.permisos}
        origenes={getOrigenes(true)}
        origenPedido={pedido.origenPedido}
        ambitoPedido={pedido.ambitoPedido}
      />
    </Suspense>
  ),
}
