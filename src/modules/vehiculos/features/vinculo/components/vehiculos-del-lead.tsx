'use client'

import { CarFrontIcon, PlusIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type {
  VehiculosDelLead as Datos,
  VehiculoVinculado,
} from '../../../entities/vehiculos-del-lead'
import { usePanelAgregarVehiculo } from '../hooks/use-panel-agregar-vehiculo'
import { useDesvincularPorUrl } from '../hooks/use-desvincular-por-url'
import { useVinculo } from '../hooks/use-vinculo'
import { ConfirmarDesvincularDiferido, PanelAgregarVehiculoDiferido } from './diferidos'
import { HistorialDeVinculos } from './historial-de-vinculos'
import { ListaDeInteresados } from './lista-de-interesados'
import { ListaDeVinculados } from './lista-de-vinculados'

type Props = { leadId: string; leadNombre: string; datos: Datos }

// Las tres listas, cada una con su tope dicho al pie (cierre 1).
function ListasDelLead(props: {
  datos: Datos
  enCurso: boolean
  alDesvincular: (vehiculo: VehiculoVinculado) => void
  alQuitar: (vehiculo: Datos['interesados'][number]) => void
}) {
  const { datos, enCurso } = props
  return (
    <>
      <ListaDeVinculados
        vinculados={datos.vinculados}
        hayMas={datos.hayMas.vinculados}
        enCurso={enCurso}
        alDesvincular={props.alDesvincular}
      />
      <ListaDeInteresados
        interesados={datos.interesados}
        hayMas={datos.hayMas.interesados}
        puedoActuar={datos.puedoActuar}
        enCurso={enCurso}
        alQuitar={props.alQuitar}
      />
      {datos.historial.length > 0 ? (
        <HistorialDeVinculos historial={datos.historial} hayMas={datos.hayMas.historial} />
      ) : null}
    </>
  )
}

const hayAlgo = (datos: Datos) =>
  datos.vinculados.length + datos.interesados.length + datos.historial.length > 0

// La sección «Vehículos» de la ficha del lead: los vinculados, los interesados (con su nota) y los
// vínculos anteriores. Sólo lo que quien mira ve: lo demás no llega ni se cuenta. Vincular y marcar
// interés piden la cartera del lead (`puedoActuar`); desvincular, poder editar el vehículo.
export function VehiculosDelLead({ leadId, leadNombre, datos }: Props) {
  const acciones = useVinculo(leadId)
  const panel = usePanelAgregarVehiculo()
  // Sin la cartera, la URL no abre nada.
  const agregando = datos.puedoActuar && panel.abierto
  const montarPanel = useAbiertoAlgunaVez(agregando)
  const confirmacion = useDesvincularPorUrl(datos.vinculados, !datos.puedoActuar)
  const montarConfirmar = useAbiertoAlgunaVez(confirmacion.abierto)
  const vacio = !hayAlgo(datos)

  // Quien puede volver a vincularlo desvincula con «Deshacer»; quien no, confirma antes.
  function desvincular(vehiculo: VehiculoVinculado) {
    if (datos.puedoActuar) {
      void acciones.desvincular(vehiculo, { deshacer: true })
    } else {
      confirmacion.abrir(vehiculo.id)
    }
  }

  const agregar = datos.puedoActuar ? (
    <Button className="h-11 w-fit md:h-9" onClick={panel.abrir}>
      <PlusIcon aria-hidden />
      Agregar vehículo
    </Button>
  ) : null

  return (
    <section aria-label="Vehículos" className="grid gap-4">
      {vacio ? (
        <EstadoVacio
          Icono={CarFrontIcon}
          titulo="Este lead no tiene vehículos que puedas ver"
          descripcion={
            datos.puedoActuar
              ? 'Vincula el vehículo que compró o marca los que le interesan.'
              : 'Los vehículos se vinculan desde la ficha de quien tiene el lead en su cartera.'
          }
          accion={agregar}
        />
      ) : (
        <>
          {agregar}
          <ListasDelLead
            datos={datos}
            enCurso={acciones.enCurso}
            alDesvincular={desvincular}
            alQuitar={(vehiculo) => void acciones.quitar(vehiculo)}
          />
        </>
      )}
      {montarPanel ? (
        <PanelAgregarVehiculoDiferido
          abierto={agregando}
          alCerrar={panel.cerrar}
          leadId={leadId}
          leadNombre={leadNombre}
          acciones={acciones}
        />
      ) : null}
      {montarConfirmar ? (
        <ConfirmarDesvincularDiferido
          abierto={confirmacion.abierto}
          vehiculo={confirmacion.vehiculo}
          enCurso={acciones.enCurso}
          alCerrar={confirmacion.cerrar}
          alConfirmar={async () => {
            if (confirmacion.vehiculo) {
              await acciones.desvincular(confirmacion.vehiculo, { deshacer: false })
            }
            confirmacion.cerrar()
          }}
        />
      ) : null}
    </section>
  )
}
