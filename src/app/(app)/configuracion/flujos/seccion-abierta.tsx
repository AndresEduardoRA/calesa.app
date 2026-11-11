import { Suspense } from 'react'
import { PantallaDelFlujo } from '@/modules/flujos/pantallas/configuracion'
import { leerRolesParaElegir } from '@/modules/equipo'
import { getOrigenes } from '@/modules/origenes'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { SECCIONES_DE_DOCUMENTOS } from './documentos/seccion'
import { SECCIONES_DE_FASES } from './fases/seccion'
import { HUECOS_DE_FLUJOS } from './huecos'
import type { PedidoDeFlujos, SeccionDeFlujos } from './pestanas'
import { SECCIONES_DE_REGLAS } from './reglas/seccion'
import { SECCIONES_DE_REQUISITOS } from './requisitos/seccion'

// Lo que dibuja cada pestaña de un área, por su clave: cada área llena el suyo en su carpeta.
const SECCIONES: Record<string, SeccionDeFlujos> = {
  ...SECCIONES_DE_REQUISITOS,
  ...SECCIONES_DE_DOCUMENTOS,
  ...SECCIONES_DE_REGLAS,
  ...SECCIONES_DE_FASES,
}

// El cuerpo de la pestaña abierta. «Fases» es del núcleo: se lee detrás de `<Suspense>` y se reinicia al cambiar de flujo.
export function SeccionAbierta({ pestana, ...pedido }: PedidoDeFlujos & { pestana: string }) {
  if (pestana === 'fases') {
    return (
      <Suspense
        key={`${pedido.origenPedido ?? ''}:${pedido.ambitoPedido ?? ''}`}
        fallback={<EsqueletoFormulario bloques={2} campos={4} />}
      >
        <PantallaDelFlujo
          permisos={pedido.permisos}
          origenes={getOrigenes(true)}
          roles={leerRolesParaElegir()}
          origenPedido={pedido.origenPedido}
          ambitoPedido={pedido.ambitoPedido}
          huecos={HUECOS_DE_FLUJOS}
        />
      </Suspense>
    )
  }
  return SECCIONES[pestana]?.(pedido) ?? null
}
