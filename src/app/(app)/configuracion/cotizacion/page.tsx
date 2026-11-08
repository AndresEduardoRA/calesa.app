import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SeccionDelDiseno } from '@/modules/cotizaciones/pantallas/diseno'
import { SeccionDeLosTonos } from '@/modules/cotizaciones/pantallas/diseno-tonos'
import { SeccionDeLaFormula } from '@/modules/cotizaciones/pantallas/formula'
import { puede, requerirSesion } from '@/modules/equipo'
import { getOrigenes } from '@/modules/origenes'
import { unParametro } from '@/shared/lib/rutas'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { alMenosUna } from '../empresa/pestanas'
import { pestanaDe, pestanasVisibles } from './pestanas'
import { PestanasDeCotizacion } from './pestanas-de-cotizacion'
import { SeccionNiveles } from './seccion-niveles'

export const metadata: Metadata = { title: 'Cotización' }

// Configuración › Cotización. Entra quien ve alguna pestaña (`pestanas.ts`): «Niveles de acceso» con `equipo.roles.ver` (los cambia quien tiene
// `equipo.roles.gestionar`: cada nivel es un permiso de la matriz de Roles) «Fórmula», «Diseño» y «Tonos» con `cotizaciones.configurar` en algún origen (4.20-2a, 4.22-2, 4.22-4). La base vuelve a
// exigir lo suyo en cada RPC y en la policy de `formulas`. Sin ninguna, «No tienes permiso» (y la sección no figura en Configuración).
export default async function PaginaDeCotizacion({
  searchParams,
}: PageProps<'/configuracion/cotizacion'>) {
  const [sesion, parametros] = await Promise.all([requerirSesion(), searchParams])
  const visibles = alMenosUna(pestanasVisibles(sesion.permisos))
  if (!visibles) {
    return <EstadoSinPermiso />
  }
  const pestana = pestanaDe(unParametro(parametros['seccion']), visibles)
  const origenPedido = unParametro(parametros['origen'])
  // La barra no recibe los permisos: sólo cuáles pestañas dibujar.
  const [primera, ...resto] = visibles
  const quitarPermisos = ({ clave, titulo }: { clave: string; titulo: string }) => ({
    clave,
    titulo,
  })
  const paraLaBarra = [quitarPermisos(primera), ...resto.map(quitarPermisos)] as const
  return (
    <div className="grid max-w-3xl gap-4">
      <div className="grid gap-1">
        <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">Cotización</h1>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Lo que se configura de la hoja con la que se cotiza.
        </p>
      </div>
      <PestanasDeCotizacion pestanas={paraLaBarra} />
      {pestana === 'niveles' ? (
        <SeccionNiveles puedeGestionar={puede(sesion.permisos, 'equipo.roles.gestionar')} />
      ) : null}
      {pestana === 'formula' ? (
        <Suspense
          key={origenPedido ?? ''}
          fallback={<EsqueletoFormulario bloques={2} campos={4} />}
        >
          <SeccionDeLaFormula
            origenes={getOrigenes(true)}
            permisos={sesion.permisos}
            origenPedido={origenPedido}
          />
        </Suspense>
      ) : null}
      {pestana === 'diseno' ? (
        <Suspense
          key={origenPedido ?? ''}
          fallback={<EsqueletoFormulario bloques={2} campos={4} />}
        >
          <SeccionDelDiseno
            origenes={getOrigenes(true)}
            permisos={sesion.permisos}
            origenPedido={origenPedido}
          />
        </Suspense>
      ) : null}
      {pestana === 'tonos' ? (
        <Suspense fallback={<EsqueletoFormulario bloques={2} campos={2} />}>
          <SeccionDeLosTonos />
        </Suspense>
      ) : null}
    </div>
  )
}
