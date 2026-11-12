import type { Metadata } from 'next'
import { Suspense } from 'react'
import { requerirSesion } from '@/modules/equipo'
import type { Permisos } from '@/shared/lib/permisos'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso, EstadoVacio } from '@/shared/ui/estados'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { alMenosUna, type AlMenosUna } from '../empresa/pestanas'
import { pestanaDe, pestanasConPermiso, pestanasVisibles, type PestanaDeWeb } from './pestanas'
import { PestanasDeWeb } from './pestanas-de-web'
import { SeccionAbierta } from './seccion-abierta'

export const metadata: Metadata = { title: 'Sitio web' }

// Configuración › Sitio web (8.01-3): lo que muestra la web pública. «Ajustes» y «Legales» se abren con `web.ajustes.gestionar`; «Guías», «Preguntas frecuentes» y
// «Testimonios» con `web.contenido.gestionar`. Sin ninguna de las dos, «No tienes permiso»; una pestaña cuyo hueco sigue nulo no se dibuja y, si no queda ninguna, dice
// que no hay nada que configurar. La base vuelve a exigir la clave en cada escritura.
export default async function PaginaDeConfiguracionDeWeb({
  searchParams,
}: PageProps<'/configuracion/web'>) {
  const [sesion, parametros] = await Promise.all([requerirSesion(), searchParams])
  if (pestanasConPermiso(sesion.permisos).length === 0) {
    return <EstadoSinPermiso />
  }
  const visibles = alMenosUna(pestanasVisibles(sesion.permisos))
  return (
    <div className="grid max-w-3xl gap-4">
      <div className="grid gap-1">
        <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">Sitio web</h1>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Lo que muestra la web pública: los ajustes del sitio, los legales, las guías, las
          preguntas frecuentes y los testimonios.
        </p>
      </div>
      {visibles ? (
        <Abierta
          visibles={visibles}
          seccion={unParametro(parametros['seccion'])}
          permisos={sesion.permisos}
        />
      ) : (
        <EstadoVacio compacto titulo="Por ahora no hay nada que configurar aquí." />
      )}
    </div>
  )
}

// Con una sola pestaña visible la barra no se dibuja.
function Abierta({
  visibles,
  seccion,
  permisos,
}: {
  visibles: AlMenosUna<PestanaDeWeb>
  seccion: string | undefined
  permisos: Permisos
}) {
  const abierta = pestanaDe(seccion, visibles)
  const [primera, ...resto] = visibles
  const sinHueco = ({ clave, titulo }: PestanaDeWeb) => ({ clave, titulo })
  return (
    <>
      {resto.length > 0 ? (
        <PestanasDeWeb pestanas={[sinHueco(primera), ...resto.map(sinHueco)]} />
      ) : null}
      <Suspense key={abierta} fallback={<EsqueletoFormulario bloques={2} campos={4} />}>
        <SeccionAbierta pestana={abierta} permisos={permisos} />
      </Suspense>
    </>
  )
}
