'use client'

import { UsersIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { EstadoError, EstadoVacio } from '@/shared/ui/estados'
import { Paginacion } from '@/shared/ui/paginacion'
import { Skeleton } from '@/shared/ui/skeleton'
import { nombreDelTipo } from '../../../entities/catalogos'
import type { ListaDelPanel } from '../../../entities/panel-para-cotizar'
import type { ListaLeida } from '../hooks/use-clientes-del-panel'
import { ClienteDelPanel } from './cliente-del-panel'

// Lo que tarda menos que esto no muestra el esqueleto: un parpadeo cuesta más que la espera.
const ESPERA_DEL_ESQUELETO_MS = 300

type Props = {
  lista: ListaDelPanel
  // Lo que se busca, para el vacío de la búsqueda.
  texto: string
  leida: ListaLeida
  elegidoId: string | null
  alElegir: (id: string) => void
  alIr: (cursor: string) => void
  alReintentar: () => void
}

function textoVacio(lista: ListaDelPanel, texto: string): string {
  if (lista === 'busqueda') {
    return `Ningún lead que puedas ver tiene «${texto}» en el nombre o ese número.`
  }
  return lista === 'todos'
    ? 'Todavía no tienes leads en tu cartera.'
    : 'No tienes leads de esta clase en tu cartera.'
}

// Una página de la lista del panel: sus estados (cargando, error, vacío) y, al pie, «Anterior» y «Siguiente» sin ir al servidor.
export function ListaDeClientes(props: Props) {
  const { lista, texto, leida, elegidoId, alElegir, alIr, alReintentar } = props
  if (leida.estado === 'cargando') {
    return <EsqueletoDeLaLista />
  }
  if (leida.estado === 'error') {
    return (
      <div role="alert">
        <EstadoError titulo="No se pudieron cargar los leads." alReintentar={alReintentar} />
      </div>
    )
  }
  const { filas, siguiente, anterior } = leida.pagina
  if (filas.length === 0) {
    return <EstadoVacio Icono={UsersIcon} titulo={textoVacio(lista, texto)} compacto />
  }
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
      <ul aria-label="Leads" className="grid grid-cols-[minmax(0,1fr)] gap-1">
        {filas.map((cliente) => (
          <ClienteDelPanel
            key={cliente.id}
            cliente={cliente}
            tipo={nombreDelTipo(leida.tipos, cliente.tipoId)}
            seleccionado={cliente.id === elegidoId}
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
    <div aria-busy="true" aria-label="Cargando leads" className="grid gap-2">
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
