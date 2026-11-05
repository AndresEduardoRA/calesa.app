'use client'

import { useRef } from 'react'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { Button } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useBusquedaDeRecordatorio } from '../hooks/use-busqueda-de-recordatorio'
import { useModalDeRecordatorio } from '../hooks/use-modal-de-recordatorio'
import type { Recordatorios } from '../hooks/use-recordatorios'
import { CompletadosPlegados } from './completados-plegados'
import { ModalDeRecordatorioDiferido } from './diferidos'
import { EsqueletoDeRecordatorios } from './esqueleto-de-recordatorios'
import { ListaDeRecordatorios } from './lista-de-recordatorios'

type Props = {
  leadId: string
  zona: string
  // `useRecordatorios(leadId)`: lo llama quien monta el bloque (la ficha le pone ahí el recordatorio
  // que nace con un seguimiento).
  recordatorios: Recordatorios
  // Dentro de una pestaña del drawer rápido: sin botón a quien volver, el modal no devuelve el foco a ciegas (4-58, como `LineaDeSeguimientos`).
  enPestana?: boolean
}

// Los pendientes: lo que hay, el vacío o el error de la primera lectura.
function Pendientes({
  ahora,
  zona,
  recordatorios,
  alEditar,
}: {
  ahora: string
  zona: string
  recordatorios: Recordatorios
  alEditar: (id: string) => void
}) {
  const { estado, listas } = recordatorios
  if (estado === 'cargando') {
    return <EsqueletoDeRecordatorios etiqueta="Cargando los recordatorios" />
  }
  if (estado === 'error') {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-2">
        <p className="text-(length:--text-sm) text-(--color-ink)">
          No se pudieron cargar los recordatorios.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={recordatorios.reintentar}>
          Reintentar
        </Button>
      </div>
    )
  }
  if (listas.pendientes.lista.length === 0) {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-faint)">
        Ningún recordatorio pendiente sobre este lead.
      </p>
    )
  }
  return (
    <ListaDeRecordatorios
      lista={listas.pendientes.lista}
      hayMas={listas.pendientes.hayMas}
      ahora={ahora}
      zona={zona}
      recordatorios={recordatorios}
      alEditar={alEditar}
      verMas={recordatorios.verMasPendientes}
      cargandoMas={recordatorios.cargandoMas === 'pendientes'}
      textoDelTope={`Mostrando los primeros ${String(TOPE_DE_LO_CARGADO)}.`}
    />
  )
}

// «Tus recordatorios» de este lead (la sección de la ficha y la pestaña del drawer): «Agendar» arriba,
// los pendientes —los vencidos primero, marcados— por páginas y, plegados, los completados, que se
// leen al abrirse. Son personales: nadie más los ve. Agendar y editar abren un modal con su URL
// (`?panel=agendar-recordatorio`, `?panel=editar-recordatorio&recordatorio=<id>`); uno de la URL que
// no está cargado se lee por su id antes de decir que no está.
export function BloqueDeRecordatorios({ leadId, zona, recordatorios, enPestana = false }: Props) {
  const botonAgendar = useRef<HTMLButtonElement>(null)
  const { pendientes, completados } = recordatorios.listas
  const cargados = [...pendientes.lista, ...(completados?.lista ?? []), ...recordatorios.sueltos]
  const buscando = useBusquedaDeRecordatorio({
    estado: recordatorios.estado,
    cargados,
    buscar: recordatorios.buscar,
  })
  const modal = useModalDeRecordatorio({
    lista: cargados,
    puedeAgendar: recordatorios.puedoAgendar,
    buscando,
  })
  const montar = useAbiertoAlgunaVez(modal.abierto)
  const ahora = new Date().toISOString()
  return (
    <section aria-label="Tus recordatorios" className="grid content-start gap-2">
      <h2 className="text-(length:--text-sm) font-semibold text-(--color-ink)">
        Tus recordatorios
      </h2>
      {recordatorios.puedoAgendar ? (
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
      <Pendientes
        ahora={ahora}
        zona={zona}
        recordatorios={recordatorios}
        alEditar={modal.abrirEdicion}
      />
      <CompletadosPlegados
        ahora={ahora}
        zona={zona}
        recordatorios={recordatorios}
        alEditar={modal.abrirEdicion}
      />
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
          focoAlCerrar={() => modal.focoAlCerrar() ?? botonAgendar.current ?? !enPestana}
          // «Recargar» tras un conflicto: sólo ése, por su id.
          alRecargar={() => {
            if (modal.original) {
              void recordatorios.recargarUno(modal.original.id)
            }
          }}
        />
      ) : null}
    </section>
  )
}
