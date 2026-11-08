import type { Metadata } from 'next'
import { Suspense } from 'react'
import { VistaPreviaDeLaPlantillaDiferida } from '@/modules/cotizaciones/pantallas/tarjeta-plantilla'
import { SeccionDeLaFormula } from '@/modules/cotizaciones/pantallas/formula'
import { SeccionDeLaPlantilla } from '@/modules/cotizaciones/pantallas/plantilla'
import { SeccionDeLasTablas } from '@/modules/cotizaciones/pantallas/tablas'
import { puedeCambiarAjustesDeCotizacion } from '@/modules/empresa'
import { puede, requerirSesion } from '@/modules/equipo'
import { getOrigenes } from '@/modules/origenes'
import { unParametro } from '@/shared/lib/rutas'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { alMenosUna } from '../empresa/pestanas'
import { pestanaDe, pestanasVisibles } from './pestanas'
import { PestanasDeCotizacion } from './pestanas-de-cotizacion'
import { SeccionAjustes } from './seccion-ajustes'
import { SeccionNiveles } from './seccion-niveles'

export const metadata: Metadata = { title: 'Cotización' }

// Configuración › Cotización. Entra quien ve alguna pestaña (`pestanas.ts`): «Niveles de acceso» con `equipo.roles.ver` (los cambia quien tiene
// `equipo.roles.gestionar`: cada nivel es un permiso de la matriz de Roles), «Fórmula» y «Tarjeta» con `cotizaciones.configurar` en algún origen (4.20-2a, 4.19-3b), «Tablas» con la
// misma clave (4.23-3) y «Ajustes» con la misma clave (la cambia quien la tiene en todos los orígenes). La base vuelve a exigir lo suyo en cada RPC y en las
// policies de `formulas` y `tablas_referencia`. Sin ninguna, «No tienes permiso» (y la sección no figura en Configuración).
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
  const tablaPedida = unParametro(parametros['tabla'])
  // La barra no recibe los permisos: sólo cuáles pestañas dibujar.
  const [primera, ...resto] = visibles
  const quitarPermisos = ({ clave, titulo }: { clave: string; titulo: string }) => ({
    clave,
    titulo,
  })
  const paraLaBarra = [quitarPermisos(primera), ...resto.map(quitarPermisos)] as const
  return (
    <div className={`grid gap-4 ${pestana === 'tarjeta' ? 'max-w-6xl' : 'max-w-3xl'}`}>
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
      {pestana === 'tarjeta' ? (
        <Suspense
          key={origenPedido ?? ''}
          fallback={<EsqueletoFormulario bloques={2} campos={4} />}
        >
          <SeccionDeLaPlantilla
            origenes={getOrigenes(true)}
            permisos={sesion.permisos}
            origenPedido={origenPedido}
            VistaPrevia={VistaPreviaDeLaPlantillaDiferida}
          />
        </Suspense>
      ) : null}
      {pestana === 'tablas' ? (
        <Suspense
          key={`${origenPedido ?? ''}:${tablaPedida ?? ''}`}
          fallback={<EsqueletoFormulario bloques={2} campos={4} />}
        >
          <SeccionDeLasTablas
            origenes={getOrigenes(true)}
            permisos={sesion.permisos}
            origenPedido={origenPedido}
            tablaPedida={tablaPedida}
          />
        </Suspense>
      ) : null}
      {pestana === 'ajustes' ? (
        <Suspense fallback={<EsqueletoFormulario bloques={1} campos={2} />}>
          <SeccionAjustes puedeCambiar={puedeCambiarAjustesDeCotizacion(sesion.permisos)} />
        </Suspense>
      ) : null}
    </div>
  )
}
