'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { formatearFechaHora } from '@/shared/lib/fechas'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { Button } from '@/shared/ui/button'
import { Drawer } from '@/shared/ui/drawer'
import { EstadoVacio } from '@/shared/ui/estados'
import { rutaDeVinculo } from '../../../entities/detalle'
import {
  estadoDeRecordatorio,
  TEXTO_DE_ESTADO_DE_RECORDATORIO,
  type DetalleDeRecordatorio,
} from '../../../entities/recordatorio'
import { useCompletarRecordatorio } from '../hooks/use-completar-recordatorio'

type Props = {
  // Nulo: no existe, está eliminado o no es tuyo (el panel dice lo mismo en los tres casos).
  recordatorio: DetalleDeRecordatorio | null
  zona: string
  // El instante en que se pidió la página (ISO): decide si ya está «Vencido» sin leer el reloj al dibujar.
  ahora: string
  alCerrar: () => void
}

function PanelConRecordatorio({
  recordatorio,
  zona,
  ahora,
  alCerrar,
}: Props & { recordatorio: DetalleDeRecordatorio }) {
  const acciones = useCompletarRecordatorio(recordatorio)
  const estado = estadoDeRecordatorio(recordatorio, ahora)
  const hecho = estado === 'completado'
  return (
    <Drawer
      abierto
      alCerrar={alCerrar}
      titulo="Recordatorio"
      pie={
        <Button
          variant={hecho ? 'outline' : 'default'}
          className="min-h-11 md:min-h-9"
          disabled={acciones.enCurso}
          onClick={() => {
            void acciones.completar(!hecho)
          }}
        >
          {hecho ? 'Reabrir' : 'Completar'}
        </Button>
      }
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-(length:--text-sm) font-semibold text-(--color-aviso-ink)">
            Recordatorio
          </span>
          <span className="text-(length:--text-sm) text-(--color-ink-soft)">
            {TEXTO_DE_ESTADO_DE_RECORDATORIO[estado]}
          </span>
        </div>
        <h2 className="text-(length:--text-lg) font-semibold break-words text-(--color-ink)">
          {recordatorio.titulo}
        </h2>
        <dl className="grid gap-0.5">
          <dt className="text-(length:--text-sm) text-(--color-ink-soft)">Cuándo</dt>
          <dd className="text-(length:--text-base) text-(--color-ink)">
            {formatearFechaHora(recordatorio.recordarEn, { zona })}
          </dd>
        </dl>
        {recordatorio.leadId && recordatorio.leadNombre ? (
          <div className="grid gap-1">
            <Link
              href={rutaDeVinculo('lead', recordatorio.leadId) as Route}
              className="inline-flex min-h-11 items-center underline md:min-h-8"
            >
              Ver el lead
            </Link>
            <p className="text-(length:--text-sm) text-(--color-ink-soft)">
              Edítalo desde el lead.
            </p>
          </div>
        ) : null}
        {acciones.conflicto ? (
          <AvisoDeConflicto
            mensaje={acciones.conflicto}
            detalle="No se guardó nada. Recargar trae su versión del recordatorio."
            alRecargar={acciones.recargar}
          />
        ) : null}
      </div>
    </Drawer>
  )
}

// El panel de un recordatorio (`?recordatorio=<id>`): qué es, cuándo, su estado con texto y «Completar» o «Reabrir». No se edita aquí: es de `leads`.
export function PanelDeRecordatorio(props: Props) {
  const { recordatorio, alCerrar } = props
  if (!recordatorio) {
    return (
      <Drawer abierto alCerrar={alCerrar} titulo="Recordatorio">
        <EstadoVacio
          titulo="No encontramos este recordatorio."
          descripcion="Pudo haberse eliminado o no es tuyo."
        />
      </Drawer>
    )
  }
  return <PanelConRecordatorio {...props} recordatorio={recordatorio} />
}
