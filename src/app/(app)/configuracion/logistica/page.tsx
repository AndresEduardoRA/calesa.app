import type { Metadata } from 'next'
import { Suspense } from 'react'
import { puede, requerirSesion } from '@/modules/equipo'
import type { CatalogoDeLogistica } from '@/modules/logistica'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso, EstadoVacio } from '@/shared/ui/estados'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { alMenosUna, type AlMenosUna } from '../empresa/pestanas'
import { catalogoDe, catalogosVisibles } from './catalogos'
import { PestanasDeLogistica } from './pestanas-de-logistica'

export const metadata: Metadata = { title: 'Logística' }

// Configuración › Logística (6.01): los catálogos que cada área llena (transporte, gastos). Entra quien tiene `logistica.catalogos.gestionar`; sin la clave, «No tienes
// permiso». Mientras ningún área llene el suyo dice que no hay nada que configurar. La base vuelve a exigir lo suyo en cada escritura.
export default async function PaginaDeConfiguracionDeLogistica({
  searchParams,
}: PageProps<'/configuracion/logistica'>) {
  const [sesion, parametros] = await Promise.all([requerirSesion(), searchParams])
  if (!puede(sesion.permisos, 'logistica.catalogos.gestionar')) {
    return <EstadoSinPermiso />
  }
  const visibles = alMenosUna(catalogosVisibles(sesion.permisos))
  return (
    <div className="grid max-w-3xl gap-4">
      <div className="grid gap-1">
        <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">Logística</h1>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Los catálogos del transporte y de los gastos.
        </p>
      </div>
      {visibles ? (
        <Abierto visibles={visibles} seccion={unParametro(parametros['seccion'])} />
      ) : (
        <EstadoVacio compacto titulo="Por ahora no hay nada que configurar aquí." />
      )}
    </div>
  )
}

// Con un solo catálogo visible la barra no se dibuja.
function Abierto({
  visibles,
  seccion,
}: {
  visibles: AlMenosUna<CatalogoDeLogistica>
  seccion: string | undefined
}) {
  const abierto = catalogoDe(seccion, visibles)
  const Catalogo = abierto.componente
  const [primero, ...resto] = visibles
  const sinComponente = ({ clave, titulo }: { clave: string; titulo: string }) => ({
    clave,
    titulo,
  })
  return (
    <>
      {resto.length > 0 ? (
        <PestanasDeLogistica pestanas={[sinComponente(primero), ...resto.map(sinComponente)]} />
      ) : null}
      <Suspense key={abierto.clave} fallback={<EsqueletoFormulario bloques={2} campos={4} />}>
        <Catalogo />
      </Suspense>
    </>
  )
}
