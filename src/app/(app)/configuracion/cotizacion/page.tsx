import type { Metadata } from 'next'
import { requerirSesion } from '@/modules/equipo'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { alMenosUna } from '../empresa/pestanas'
import { pestanaDe, pestanasVisibles } from './pestanas'
import { PestanasDeCotizacion } from './pestanas-de-cotizacion'
import { SeccionAbierta } from './seccion-abierta'

export const metadata: Metadata = { title: 'Configurar cotizaciones' }

// Configuración › Cotización. Entra quien ve alguna pestaña (`pestanas.ts`): «Niveles de acceso» con `equipo.roles.ver` (los cambia quien tiene
// `equipo.roles.gestionar`: cada nivel es un permiso de la matriz de Roles), «Fórmula», «Tarjeta», «Diseño» y «Tonos» con `cotizaciones.configurar` en algún origen
// (4.20-2a, 4.19-3b, 4.22-2, 4.22-4), «Tablas» con la misma clave (4.23-3) y «Ajustes» con la misma clave (la cambia quien la tiene en todos los orígenes). La base
// vuelve a exigir lo suyo en cada RPC y en las policies de `formulas` y `tablas_referencia`. Sin ninguna, «No tienes permiso» (y la sección no figura en Configuración).
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
      <SeccionAbierta
        pestana={pestana}
        permisos={sesion.permisos}
        origenPedido={origenPedido}
        tablaPedida={tablaPedida}
      />
    </div>
  )
}
