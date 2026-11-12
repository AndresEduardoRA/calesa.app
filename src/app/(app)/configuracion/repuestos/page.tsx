import type { Metadata } from 'next'
import { Suspense } from 'react'
import { puede, requerirSesion } from '@/modules/equipo'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { alMenosUna } from '../empresa/pestanas'
import { EnlaceAlFlujo } from './enlace-al-flujo'
import { pestanaDe, pestanasVisibles } from './pestanas'
import { PestanasDeRepuestos } from './pestanas-de-repuestos'
import { SeccionCatalogos } from './seccion-catalogos'
import { SeccionCotizador } from './seccion-cotizador'

export const metadata: Metadata = { title: 'Repuestos' }

// Configuración › Repuestos (8.08-3): los catálogos que se eligen en cada ítem y el cotizador (8.12-2). Entra quien tiene `repuestos.configurar`; sin la
// clave, «No tienes permiso». Con dos o más pestañas visibles se dibuja la barra. La base vuelve a exigir la clave en cada escritura.
export default async function PaginaDeConfiguracionDeRepuestos({
  searchParams,
}: PageProps<'/configuracion/repuestos'>) {
  const [sesion, parametros] = await Promise.all([requerirSesion(), searchParams])
  const visibles = alMenosUna(pestanasVisibles(sesion.permisos))
  if (!puede(sesion.permisos, 'repuestos.configurar') || !visibles) {
    return <EstadoSinPermiso />
  }
  const abierta = pestanaDe(unParametro(parametros['seccion']), visibles)
  return (
    <div className="grid max-w-3xl gap-4">
      <div className="grid gap-1">
        <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">Repuestos</h1>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Los catálogos de los ítems y el cotizador: factor, recargo, redondeo, tramos de logística
          y cajas.
        </p>
      </div>
      <EnlaceAlFlujo />
      {visibles.length > 1 ? <PestanasDeRepuestos pestanas={visibles} /> : null}
      {abierta === 'cotizador' ? (
        <Suspense key={abierta} fallback={<EsqueletoFormulario bloques={3} campos={3} />}>
          <SeccionCotizador />
        </Suspense>
      ) : (
        <Suspense key={abierta} fallback={<EsqueletoFormulario bloques={4} campos={3} />}>
          <SeccionCatalogos />
        </Suspense>
      )}
    </div>
  )
}
