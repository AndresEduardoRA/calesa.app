'use client'

import { useState } from 'react'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'
import { Drawer } from '@/shared/ui/drawer'
import { useConsultaDeMedios } from '@/shared/ui/use-consulta-de-medios'
import { useCandidatos } from '../hooks/use-candidatos'
import type { AccionesDeVinculo } from '../hooks/use-vinculo'
import { AccionesDelCandidato } from './acciones-del-candidato'
import { ListaDeCandidatos } from './lista-de-candidatos'

const COSTADO = '(min-width: 640px)'

type Props = {
  abierto: boolean
  alCerrar: () => void
  leadId: string
  leadNombre: string
  acciones: AccionesDeVinculo
}

function Contenido({ leadId, acciones, alCerrar }: Omit<Props, 'abierto' | 'leadNombre'>) {
  const [texto, setTexto] = useState('')
  const [elegidoId, setElegidoId] = useState<string | null>(null)
  // La nota de cada vehículo que se tipeó y no se mandó: cambiar de candidato o de búsqueda no la pierde, y cerrar el panel con
  // alguna escrita pregunta (no tiene borrador: se perdería).
  const [notas, setNotas] = useState<Record<string, string>>({})
  useCambiosSinGuardar(
    Object.values(notas).some((nota) => nota.trim() !== ''),
    () => {
      setNotas({})
    },
    { preguntaAlCerrar: true },
  )
  const { busqueda, reintentar } = useCandidatos(leadId, texto)
  const elegido =
    busqueda.estado === 'lista'
      ? (busqueda.candidatos.find((c) => c.id === elegidoId) ?? null)
      : null
  return (
    <div className="grid gap-4">
      <ListaDeCandidatos
        texto={texto}
        alBuscar={(nuevo) => {
          setTexto(nuevo)
          setElegidoId(null)
        }}
        busqueda={busqueda}
        alReintentar={reintentar}
        elegidoId={elegidoId}
        alElegir={setElegidoId}
      />
      {elegido ? (
        <AccionesDelCandidato
          key={elegido.id}
          candidato={elegido}
          nota={notas[elegido.id] ?? ''}
          alEscribirNota={(nota) => {
            setNotas((antes) => ({ ...antes, [elegido.id]: nota }))
          }}
          acciones={acciones}
          alTerminar={alCerrar}
        />
      ) : null}
    </div>
  )
}

// «Agregar vehículo»: buscar entre los vehículos que quien mira ve y vincularlo o marcar interés.
// Hoja inferior en el celular. La lista se lee al abrir (otra persona pudo vincular algo).
export function PanelAgregarVehiculo({ abierto, alCerrar, leadId, leadNombre, acciones }: Props) {
  const alCostado = useConsultaDeMedios(COSTADO)
  return (
    <Drawer
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Agregar vehículo"
      descripcion={leadNombre}
      lado={alCostado ? 'right' : 'bottom'}
    >
      {abierto ? <Contenido leadId={leadId} acciones={acciones} alCerrar={alCerrar} /> : null}
    </Drawer>
  )
}
