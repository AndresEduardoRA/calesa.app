'use client'

import { Button } from '@/shared/ui/button'
import { useRegional } from '@/shared/ui/regional'
import { BloqueDeRecordatorios } from '../../recordatorios/components/bloque-de-recordatorios'
import { useRecordatorios } from '../../recordatorios/hooks/use-recordatorios'
import { EsqueletoDeSeguimientos } from '../../seguimientos/components/esqueleto-de-seguimientos'
import { LineaDeSeguimientos } from '../../seguimientos/components/linea-de-seguimientos'
import { useSeguimientos } from '../../seguimientos/hooks/use-seguimientos'
import { useSeguimientosDelRapido, type DatosDelRapido } from '../hooks/use-seguimientos-del-rapido'

function Contenido({
  leadId,
  datos,
  alRecargarRecordatorios,
}: {
  leadId: string
  datos: DatosDelRapido
  alRecargarRecordatorios: () => void
}) {
  const { zonaHoraria } = useRegional()
  const seguimientos = useSeguimientos(leadId, datos.pagina)
  const deQuienMira = useRecordatorios(datos.recordatorios)
  return (
    <div className="grid min-w-0 gap-6">
      <LineaDeSeguimientos
        leadId={leadId}
        tipos={datos.tipos}
        zona={zonaHoraria}
        seguimientos={seguimientos}
        alAgendar={deQuienMira.poner}
      />
      <BloqueDeRecordatorios
        leadId={leadId}
        zona={zonaHoraria}
        recordatorios={deQuienMira}
        puedeAgendar={seguimientos.puedoAnotar}
        alRecargar={alRecargarRecordatorios}
      />
    </div>
  )
}

// La pestaña «Seguimientos» del drawer rápido: la línea de tiempo (anotar, editar y eliminar lo propio,
// «Ver más») y, debajo, «Tus recordatorios». Se lee al elegir la pestaña, desde el navegador. Los
// modales se dibujan dentro del drawer: Base UI los anida (Esc cierra sólo el de arriba).
export function SeguimientosDelRapido({ leadId }: { leadId: string }) {
  const { lectura, reintentar, releerRecordatorios } = useSeguimientosDelRapido(leadId)
  if (lectura === null) {
    return <EsqueletoDeSeguimientos />
  }
  if (lectura.estado === 'error') {
    return (
      <div role="alert" className="grid gap-3">
        <p className="text-(length:--text-sm) text-(--color-ink)">
          No se pudieron cargar los seguimientos.
        </p>
        <Button type="button" variant="outline" onClick={reintentar} className="w-fit">
          Reintentar
        </Button>
      </div>
    )
  }
  return (
    <Contenido
      key={leadId}
      leadId={leadId}
      datos={lectura.datos}
      alRecargarRecordatorios={() => void releerRecordatorios()}
    />
  )
}
