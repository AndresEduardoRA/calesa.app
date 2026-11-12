import type { Metadata } from 'next'
import { Suspense } from 'react'
import { puede, requerirSesion } from '@/modules/equipo'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { alMenosUna } from '../empresa/pestanas'
import { pestanaDe, pestanasVisibles } from './pestanas'
import { SeccionCatalogos } from './seccion-catalogos'

export const metadata: Metadata = { title: 'Repuestos' }

// Configuración › Repuestos (8.08-3): los catálogos que se eligen en cada ítem. Entra quien tiene `repuestos.configurar`; sin la clave, «No tienes permiso».
// Con una sola pestaña («Catálogos») no hay barra; «Cotizador» llega con el 8.12. La base vuelve a exigir la clave en cada escritura.
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
          Los catálogos que se eligen en cada ítem: tipo de pieza, condición, vía de transporte y
          país de origen.
        </p>
      </div>
      {/* Hoy la única pestaña es «Catálogos»; el 8.12 suma «Cotizador» y su barra. */}
      <Suspense key={abierta} fallback={<EsqueletoFormulario bloques={4} campos={3} />}>
        <SeccionCatalogos />
      </Suspense>
    </div>
  )
}
