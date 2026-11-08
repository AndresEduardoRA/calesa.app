import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { SeccionDelDiseno } from '@/modules/cotizaciones/pantallas/diseno'
import { SeccionDeLosTonos } from '@/modules/cotizaciones/pantallas/diseno-tonos'
import { SeccionDeLaFormula } from '@/modules/cotizaciones/pantallas/formula'
import { SeccionDeLaPlantilla } from '@/modules/cotizaciones/pantallas/plantilla'
import { SeccionDeLasTablas } from '@/modules/cotizaciones/pantallas/tablas'
import { VistaPreviaDeLaPlantillaDiferida } from '@/modules/cotizaciones/pantallas/tarjeta-plantilla'
import { puedeCambiarAjustesDeCotizacion } from '@/modules/empresa'
import { puede } from '@/modules/equipo'
import { getOrigenes } from '@/modules/origenes'
import type { Permisos } from '@/shared/lib/permisos'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import type { Pestana } from './pestanas'
import { SeccionAjustes } from './seccion-ajustes'
import { SeccionNiveles } from './seccion-niveles'

type Pedido = {
  permisos: Permisos
  origenPedido: string | undefined
  tablaPedida: string | undefined
}

// El cuerpo de la pestaña abierta. Cada una con su `Suspense` (leer la base va tras él) y su `key` cuando lo que pide la URL reinicia la sección.
const SECCIONES: Record<Pestana, (pedido: Pedido) => ReactNode> = {
  niveles: ({ permisos }) => (
    <SeccionNiveles puedeGestionar={puede(permisos, 'equipo.roles.gestionar')} />
  ),
  formula: ({ permisos, origenPedido }) => (
    <Suspense key={origenPedido ?? ''} fallback={<EsqueletoFormulario bloques={2} campos={4} />}>
      <SeccionDeLaFormula
        origenes={getOrigenes(true)}
        permisos={permisos}
        origenPedido={origenPedido}
      />
    </Suspense>
  ),
  tarjeta: ({ permisos, origenPedido }) => (
    <Suspense key={origenPedido ?? ''} fallback={<EsqueletoFormulario bloques={2} campos={4} />}>
      <SeccionDeLaPlantilla
        origenes={getOrigenes(true)}
        permisos={permisos}
        origenPedido={origenPedido}
        VistaPrevia={VistaPreviaDeLaPlantillaDiferida}
      />
    </Suspense>
  ),
  diseno: ({ permisos, origenPedido }) => (
    <Suspense key={origenPedido ?? ''} fallback={<EsqueletoFormulario bloques={2} campos={4} />}>
      <SeccionDelDiseno
        origenes={getOrigenes(true)}
        permisos={permisos}
        origenPedido={origenPedido}
      />
    </Suspense>
  ),
  tonos: () => (
    <Suspense fallback={<EsqueletoFormulario bloques={2} campos={2} />}>
      <SeccionDeLosTonos />
    </Suspense>
  ),
  tablas: ({ permisos, origenPedido, tablaPedida }) => (
    <Suspense
      key={`${origenPedido ?? ''}:${tablaPedida ?? ''}`}
      fallback={<EsqueletoFormulario bloques={2} campos={4} />}
    >
      <SeccionDeLasTablas
        origenes={getOrigenes(true)}
        permisos={permisos}
        origenPedido={origenPedido}
        tablaPedida={tablaPedida}
      />
    </Suspense>
  ),
  ajustes: ({ permisos }) => (
    <Suspense fallback={<EsqueletoFormulario bloques={1} campos={2} />}>
      <SeccionAjustes puedeCambiar={puedeCambiarAjustesDeCotizacion(permisos)} />
    </Suspense>
  ),
}

export function SeccionAbierta({ pestana, ...pedido }: Pedido & { pestana: Pestana }) {
  return SECCIONES[pestana](pedido)
}
