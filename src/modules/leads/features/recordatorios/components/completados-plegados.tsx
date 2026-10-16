'use client'

import { Button } from '@/shared/ui/button'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import type { Recordatorios } from '../hooks/use-recordatorios'
import { EsqueletoDeRecordatorios } from './esqueleto-de-recordatorios'
import { ListaDeRecordatorios } from './lista-de-recordatorios'

type Props = {
  ahora: string
  zona: string
  recordatorios: Recordatorios
  alEditar: (id: string) => void
}

// «Completados», plegado y sin número (contarlos crecería con el total): no lee nada hasta abrirse, y
// después se pagina como los pendientes. Sólo aparece si hay alguno.
export function CompletadosPlegados({ ahora, zona, recordatorios, alEditar }: Props) {
  const { completados: estado, listas } = recordatorios
  if (!listas.hayCompletados) {
    return null
  }
  return (
    <details
      className="grid gap-2"
      onToggle={(evento) => {
        if (evento.currentTarget.open) {
          recordatorios.abrirCompletados()
        }
      }}
    >
      <summary className="min-h-11 cursor-pointer text-(length:--text-sm) text-(--color-ink-soft) md:min-h-8">
        Completados
      </summary>
      {estado === 'error' ? (
        <div role="alert" className="flex flex-wrap items-center gap-2">
          <p className="text-(length:--text-sm) text-(--color-ink)">
            No se pudieron cargar los completados.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={recordatorios.abrirCompletados}
          >
            Reintentar
          </Button>
        </div>
      ) : listas.completados === null ? (
        <EsqueletoDeRecordatorios etiqueta="Cargando los completados" />
      ) : listas.completados.lista.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-faint)">
          Ningún recordatorio completado sobre este lead.
        </p>
      ) : (
        <ListaDeRecordatorios
          lista={listas.completados.lista}
          hayMas={listas.completados.hayMas}
          ahora={ahora}
          zona={zona}
          recordatorios={recordatorios}
          alEditar={alEditar}
          verMas={recordatorios.verMasCompletados}
          cargandoMas={recordatorios.cargandoMas === 'completados'}
          textoDelTope={`Mostrando los ${String(TOPE_DE_LO_CARGADO)} completados más recientes.`}
        />
      )}
    </details>
  )
}
