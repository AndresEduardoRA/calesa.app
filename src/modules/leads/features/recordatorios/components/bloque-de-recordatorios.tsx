'use client'

import { useState } from 'react'
import { Button } from '@/shared/ui/button'
import {
  estadoDelRecordatorio,
  ordenarRecordatorios,
  type Recordatorio,
} from '../../../entities/recordatorios'
import type { Recordatorios } from '../hooks/use-recordatorios'
import { FormularioDeRecordatorio } from './formulario-de-recordatorio'
import { ItemDeRecordatorio } from './item-de-recordatorio'

type Props = {
  leadId: string
  zona: string
  recordatorios: Recordatorios
  // Lead en la cartera y `leads.editar`: agendar uno nuevo. Los que ya son suyos se tocan igual.
  puedeAgendar: boolean
}

function Lista({
  lista,
  ahora,
  zona,
  leadId,
  recordatorios,
}: {
  lista: readonly Recordatorio[]
  ahora: string
  zona: string
  leadId: string
  recordatorios: Recordatorios
}) {
  const [editando, setEditando] = useState<string | null>(null)
  return (
    <ul className="grid gap-2">
      {lista.map((r) =>
        editando === r.id ? (
          <li key={r.id}>
            <FormularioDeRecordatorio
              leadId={leadId}
              zona={zona}
              original={r}
              alGuardar={(guardado) => {
                recordatorios.poner(guardado)
                setEditando(null)
              }}
              alCerrar={() => {
                setEditando(null)
              }}
            />
          </li>
        ) : (
          <li key={r.id}>
            <ItemDeRecordatorio
              recordatorio={r}
              estado={estadoDelRecordatorio(r, ahora)}
              zona={zona}
              enCurso={recordatorios.enCurso}
              alCompletar={(completado) => void recordatorios.completar(r, completado)}
              alEditar={() => {
                setEditando(r.id)
              }}
              alEliminar={() => void recordatorios.eliminar(r)}
            />
          </li>
        ),
      )}
    </ul>
  )
}

// «Tus recordatorios» de este lead: los vencidos primero y marcados, después los pendientes y, al
// final y plegados, los completados. Son personales: nadie más los ve.
export function BloqueDeRecordatorios({ leadId, zona, recordatorios, puedeAgendar }: Props) {
  const [agendando, setAgendando] = useState(false)
  const ahora = new Date().toISOString()
  const ordenados = ordenarRecordatorios(recordatorios.lista, ahora)
  const abiertos = ordenados.filter((r) => r.completadoEn === null)
  const completados = ordenados.filter((r) => r.completadoEn !== null)
  return (
    <section aria-label="Tus recordatorios" className="grid content-start gap-2">
      <h2 className="text-(length:--text-sm) font-semibold text-(--color-ink)">
        Tus recordatorios
      </h2>
      {agendando ? (
        <FormularioDeRecordatorio
          leadId={leadId}
          zona={zona}
          original={null}
          alGuardar={(nuevo) => {
            recordatorios.poner(nuevo)
            setAgendando(false)
          }}
          alCerrar={() => {
            setAgendando(false)
          }}
        />
      ) : puedeAgendar ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-fit md:min-h-8"
          onClick={() => {
            setAgendando(true)
          }}
        >
          Agendar recordatorio
        </Button>
      ) : null}
      {abiertos.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-faint)">
          Ningún recordatorio pendiente sobre este lead.
        </p>
      ) : (
        <Lista
          lista={abiertos}
          ahora={ahora}
          zona={zona}
          leadId={leadId}
          recordatorios={recordatorios}
        />
      )}
      {completados.length > 0 ? (
        <details className="grid gap-2">
          <summary className="min-h-11 cursor-pointer text-(length:--text-sm) text-(--color-ink-soft) md:min-h-8">
            Completados ({completados.length})
          </summary>
          <Lista
            lista={completados}
            ahora={ahora}
            zona={zona}
            leadId={leadId}
            recordatorios={recordatorios}
          />
        </details>
      ) : null}
    </section>
  )
}
