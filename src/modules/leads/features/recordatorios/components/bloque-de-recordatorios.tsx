'use client'

import { useRef } from 'react'
import { Button } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import {
  estadoDelRecordatorio,
  ordenarRecordatorios,
  type Recordatorio,
} from '../../../entities/recordatorios'
import { useModalDeRecordatorio } from '../hooks/use-modal-de-recordatorio'
import type { Recordatorios } from '../hooks/use-recordatorios'
import { ModalDeRecordatorioDiferido } from './diferidos'
import { ItemDeRecordatorio } from './item-de-recordatorio'

type Props = {
  leadId: string
  zona: string
  recordatorios: Recordatorios
  // Lead en la cartera y `leads.editar`: agendar uno nuevo. Los que ya son suyos se tocan igual.
  puedeAgendar: boolean
  // «Recargar» tras un conflicto en el modal: sin esto, se vuelve a leer la página (la ficha).
  alRecargar?: () => void
}

function Lista({
  lista,
  ahora,
  zona,
  recordatorios,
  alEditar,
}: {
  lista: readonly Recordatorio[]
  ahora: string
  zona: string
  recordatorios: Recordatorios
  alEditar: (id: string) => void
}) {
  return (
    <ul className="grid gap-2">
      {lista.map((r) => (
        <li key={r.id}>
          <ItemDeRecordatorio
            recordatorio={r}
            estado={estadoDelRecordatorio(r, ahora)}
            zona={zona}
            enCurso={recordatorios.enCurso}
            alCompletar={(completado) => void recordatorios.completar(r, completado)}
            alEditar={() => {
              alEditar(r.id)
            }}
            alEliminar={() => void recordatorios.eliminar(r)}
          />
        </li>
      ))}
    </ul>
  )
}

// «Tus recordatorios» de este lead: los vencidos primero y marcados, después los pendientes y, al
// final y plegados, los completados. Son personales: nadie más los ve. Agendar y editar abren un modal
// con su URL (`?panel=agendar-recordatorio`, `?panel=editar-recordatorio&recordatorio=<id>`).
export function BloqueDeRecordatorios({
  leadId,
  zona,
  recordatorios,
  puedeAgendar,
  alRecargar,
}: Props) {
  const botonAgendar = useRef<HTMLButtonElement>(null)
  const modal = useModalDeRecordatorio({ lista: recordatorios.lista, puedeAgendar })
  const montar = useAbiertoAlgunaVez(modal.abierto)
  const ahora = new Date().toISOString()
  const ordenados = ordenarRecordatorios(recordatorios.lista, ahora)
  const abiertos = ordenados.filter((r) => r.completadoEn === null)
  const completados = ordenados.filter((r) => r.completadoEn !== null)
  const lista = (de: readonly Recordatorio[]) => (
    <Lista
      lista={de}
      ahora={ahora}
      zona={zona}
      recordatorios={recordatorios}
      alEditar={modal.abrirEdicion}
    />
  )
  return (
    <section aria-label="Tus recordatorios" className="grid content-start gap-2">
      <h2 className="text-(length:--text-sm) font-semibold text-(--color-ink)">
        Tus recordatorios
      </h2>
      {puedeAgendar ? (
        <Button
          ref={botonAgendar}
          type="button"
          variant="outline"
          className="min-h-11 w-fit md:min-h-8"
          onClick={modal.abrirAgendar}
        >
          Agendar recordatorio
        </Button>
      ) : null}
      {abiertos.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-faint)">
          Ningún recordatorio pendiente sobre este lead.
        </p>
      ) : (
        lista(abiertos)
      )}
      {completados.length > 0 ? (
        <details className="grid gap-2">
          <summary className="min-h-11 cursor-pointer text-(length:--text-sm) text-(--color-ink-soft) md:min-h-8">
            Completados ({completados.length})
          </summary>
          {lista(completados)}
        </details>
      ) : null}
      {montar ? (
        <ModalDeRecordatorioDiferido
          key={modal.llave}
          abierto={modal.abierto}
          alCerrar={modal.cerrar}
          leadId={leadId}
          zona={zona}
          original={modal.original}
          noDisponible={modal.noDisponible}
          alGuardar={(guardado) => {
            recordatorios.poner(guardado)
            modal.cerrar()
          }}
          focoAlCerrar={() => modal.focoAlCerrar() ?? botonAgendar.current ?? true}
          alRecargar={alRecargar}
        />
      ) : null}
    </section>
  )
}
