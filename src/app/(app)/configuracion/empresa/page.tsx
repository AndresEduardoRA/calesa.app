import type { Metadata } from 'next'
import { puede, requerirSesion } from '@/modules/equipo'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { pestanaDe } from './pestanas'
import { PestanasEmpresa } from './pestanas-empresa'
import { SeccionEmpresa } from './seccion-empresa'
import { SeccionMonedas } from './seccion-monedas'

export const metadata: Metadata = { title: 'Empresa' }

// Configuración › Empresa. Entra quien tiene alguno de los dos permisos de la empresa; cada
// pestaña se edita con el suyo y, sin él, se ve deshabilitada con el motivo.
export default async function PaginaEmpresa({ searchParams }: PageProps<'/configuracion/empresa'>) {
  const [sesion, parametros] = await Promise.all([requerirSesion(), searchParams])
  const puedeAjustes = puede(sesion.permisos, 'empresa.ajustes.gestionar')
  const puedeTiposCambio = puede(sesion.permisos, 'empresa.tipos_cambio.gestionar')
  if (!puedeAjustes && !puedeTiposCambio) {
    return <EstadoSinPermiso />
  }
  const pestana = pestanaDe(unParametro(parametros['seccion']))

  return (
    <div className="grid max-w-3xl gap-4">
      <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">Empresa</h1>
      <PestanasEmpresa />
      {pestana === 'empresa' ? <SeccionEmpresa puedeEditar={puedeAjustes} /> : null}
      {pestana === 'monedas' ? (
        <SeccionMonedas
          puedeGestionar={puedeTiposCambio}
          tipoCambioAbierto={unParametro(parametros['tc'])}
        />
      ) : null}
    </div>
  )
}
