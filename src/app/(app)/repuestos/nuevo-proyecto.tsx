'use client'

import {
  DrawerDeNuevoProyectoDiferido,
  useNuevoProyectoPorUrl,
  type BuscadorDeProyecto,
} from '@/modules/repuestos/pantallas/proyectos'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { BuscadorDeLead } from './buscador-de-lead'
import { BuscadorDeVehiculo } from './buscador-de-vehiculo'

// El vehículo de `?vehiculo=` tal como lo resolvió el servidor al cargar: su título si quien mira lo ve, nulo si no existe o no se ve (sin distinguirlos).
export type VehiculoDeLaUrl = { id: string; titulo: string | null }

type Props = {
  puedeEditar: boolean
  puedeVerLeads: boolean
  vehiculoDeLaUrl: VehiculoDeLaUrl | null
}

const AVISO_DEL_VEHICULO = 'No encontramos ese vehículo o no tienes acceso.'

const buscadorDeVehiculo: BuscadorDeProyecto = (props) => <BuscadorDeVehiculo {...props} />
const buscadorDeLead: BuscadorDeProyecto = (props) => <BuscadorDeLead {...props} />

// «Nuevo proyecto»: el drawer con los dos buscadores que compone `src/app` (`repuestos` no importa `buscador`). Se monta la primera vez que se abre. Un `?vehiculo=` que el servidor
// resolvió abre el formulario ya vinculado; uno inválido, o que no se ve, lo abre como «Externo» con un aviso, nunca con un error.
export function NuevoProyecto({ puedeEditar, puedeVerLeads, vehiculoDeLaUrl }: Props) {
  const panel = useNuevoProyectoPorUrl(puedeEditar)
  const montado = useAbiertoAlgunaVez(panel.abierto)
  if (!montado) {
    return null
  }
  const pedido = panel.vehiculoEnLaUrl
  const resuelto =
    vehiculoDeLaUrl !== null && vehiculoDeLaUrl.id === pedido ? vehiculoDeLaUrl : null
  const vehiculoInicial =
    resuelto !== null && resuelto.titulo !== null
      ? { id: resuelto.id, titulo: resuelto.titulo }
      : null
  return (
    <DrawerDeNuevoProyectoDiferido
      abierto={panel.abierto}
      alCerrar={panel.cerrar}
      apertura={panel.apertura}
      vehiculoInicial={vehiculoInicial}
      avisoDelVehiculo={pedido !== null && vehiculoInicial === null ? AVISO_DEL_VEHICULO : null}
      puedeVerLeads={puedeVerLeads}
      buscadorDeVehiculo={buscadorDeVehiculo}
      buscadorDeLead={buscadorDeLead}
    />
  )
}
