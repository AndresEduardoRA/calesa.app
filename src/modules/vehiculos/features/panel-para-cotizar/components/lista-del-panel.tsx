'use client'

import { CarFrontIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { EstadoError, EstadoVacio } from '@/shared/ui/estados'
import { Paginacion } from '@/shared/ui/paginacion'
import { Skeleton } from '@/shared/ui/skeleton'
import type { ListaDelPanel as Lista, PestanaDelPanel } from '../../../entities/panel-para-cotizar'
import type { ListaLeida } from '../hooks/use-lista-del-panel'
import { VehiculoDelPanel } from './vehiculo-del-panel'

const VACIO: Record<PestanaDelPanel, string> = {
  ultima: 'Todavía no se cotizó ningún vehículo de este origen.',
  cierre: 'No hay subastas abiertas o en vivo que cierren desde ayer.',
}

// Lo que tarda menos que esto no muestra el esqueleto: un parpadeo cuesta más que la espera.
const ESPERA_DEL_ESQUELETO_MS = 300

type Props = {
  lista: Lista
  // Lo que se busca, para el vacío de la búsqueda.
  texto: string
  leida: ListaLeida
  elegidoId: string | null
  alElegir: (id: string) => void
  alIr: (cursor: string) => void
  alReintentar: () => void
}

// Una página de la lista del panel: sus estados (cargando, error, vacío) y, al pie, «Anterior» y «Siguiente» sin ir al servidor.
export function ListaDelPanel(props: Props) {
  const { lista, texto, leida, elegidoId, alElegir, alIr, alReintentar } = props
  if (leida.estado === 'cargando') {
    return <EsqueletoDeLaLista />
  }
  if (leida.estado === 'error') {
    return (
      <div role="alert">
        <EstadoError titulo="No se pudieron cargar los vehículos." alReintentar={alReintentar} />
      </div>
    )
  }
  const { filas, siguiente, anterior } = leida.pagina
  if (filas.length === 0) {
    const vacio =
      lista === 'busqueda'
        ? `Ningún vehículo de este origen tiene «${texto}» en el título, el VIN o el lote.`
        : VACIO[lista]
    return <EstadoVacio Icono={CarFrontIcon} titulo={vacio} compacto />
  }
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
      <ul aria-label="Vehículos" className="grid grid-cols-[minmax(0,1fr)] gap-1">
        {filas.map((vehiculo) => (
          <VehiculoDelPanel
            key={vehiculo.id}
            vehiculo={vehiculo}
            seleccionado={vehiculo.id === elegidoId}
            alElegir={alElegir}
          />
        ))}
      </ul>
      <Paginacion siguiente={siguiente} anterior={anterior} alIr={alIr} />
    </div>
  )
}

function EsqueletoDeLaLista() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const espera = setTimeout(() => {
      setVisible(true)
    }, ESPERA_DEL_ESQUELETO_MS)
    return () => {
      clearTimeout(espera)
    }
  }, [])
  return (
    <div aria-busy="true" aria-label="Cargando vehículos" className="grid gap-2">
      {visible ? (
        <>
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </>
      ) : null}
    </div>
  )
}
