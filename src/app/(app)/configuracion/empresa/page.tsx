import type { Metadata } from 'next'
import { puede, requerirSesion } from '@/modules/equipo'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { SeccionDeComprobantes } from './comprobantes/seccion'
import { alMenosUna, esPestanaDeUnArea, pestanaDe, pestanasVisibles } from './pestanas'
import { PestanasEmpresa } from './pestanas-empresa'
import { SeccionEmpresa } from './seccion-empresa'
import { SeccionIntegraciones } from './seccion-integraciones'
import { SeccionMonedas } from './seccion-monedas'

export const metadata: Metadata = { title: 'Empresa' }

// Configuración › Empresa. Entra quien ve alguna pestaña (`pestanas.ts`: hoy, quien tiene alguno de los dos
// permisos de la empresa); cada pestaña se edita con el suyo y, sin él, se ve deshabilitada con el motivo.
export default async function PaginaEmpresa({ searchParams }: PageProps<'/configuracion/empresa'>) {
  const [sesion, parametros] = await Promise.all([requerirSesion(), searchParams])
  const visibles = alMenosUna(pestanasVisibles(sesion.permisos))
  if (!visibles) {
    return <EstadoSinPermiso />
  }
  const puedeAjustes = puede(sesion.permisos, 'empresa.ajustes.gestionar')
  const puedeTiposCambio = puede(sesion.permisos, 'empresa.tipos_cambio.gestionar')
  const pestana = pestanaDe(unParametro(parametros['seccion']), visibles)
  // La barra no recibe los permisos: sólo cuáles pestañas dibujar.
  const [primera, ...resto] = visibles
  const quitarPermisos = ({ clave, titulo }: { clave: string; titulo: string }) => ({
    clave,
    titulo,
  })
  const paraLaBarra = [quitarPermisos(primera), ...resto.map(quitarPermisos)] as const

  return (
    <div className="grid max-w-3xl gap-4">
      <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">Empresa</h1>
      <PestanasEmpresa pestanas={paraLaBarra} />
      {pestana === 'empresa' ? <SeccionEmpresa puedeEditar={puedeAjustes} /> : null}
      {pestana === 'monedas' ? (
        <SeccionMonedas
          puedeGestionar={puedeTiposCambio}
          tipoCambioAbierto={unParametro(parametros['tc'])}
        />
      ) : null}
      {pestana === 'integraciones' ? <SeccionIntegraciones puedeEditar={puedeAjustes} /> : null}
      {esPestanaDeUnArea(pestana) ? (
        <SeccionDeComprobantes
          pestana={pestana}
          permisos={sesion.permisos}
          parametros={parametros}
        />
      ) : null}
    </div>
  )
}
