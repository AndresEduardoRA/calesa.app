'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { interpretarBusqueda } from '@/modules/leads/client'
import { Command, CommandDialog, CommandInput, CommandList } from '@/shared/ui/command'
import {
  filtrarAcciones,
  type AccionDeLaPaleta,
  type DestinoDeLaAccion,
} from '../../../entities/acciones-de-la-paleta'
import { useBusquedaDeLaPaleta } from '../hooks/use-busqueda-de-la-paleta'
import { useUltimosAbiertos } from '../hooks/use-ultimos-abiertos'
import { CuerpoDeLaPaleta } from './cuerpo-de-la-paleta'

export type PropsDeLaPaleta = {
  abierta: boolean
  alCambiar: (abierta: boolean) => void
  // Ya filtradas por `puede()` en el servidor: la paleta no sabe de permisos.
  acciones: readonly AccionDeLaPaleta[]
  alAbrirNuevoLead: () => void
  alVerAtajos: () => void
}

// Lo que corre después de cerrar la paleta: Base UI le devuelve el foco a quien la abrió al cerrar; lo siguiente (otro panel, otra lista) espera a que lo haya hecho
// para que su foco no lo pise.
const DESPUES_DE_CERRAR_MS = 0

// La paleta `Ctrl/Cmd+K`: «Últimos abiertos» y acciones sin texto; con texto, las acciones que coinciden y una sección por tipo. Sin URL (una superposición, D3).
// El filtro es propio (`shouldFilter={false}`): lo que llega de la base ya viene acotado y ordenado.
export function Paleta({
  abierta,
  alCambiar,
  acciones,
  alAbrirNuevoLead,
  alVerAtajos,
}: PropsDeLaPaleta) {
  const router = useRouter()
  const [texto, setTexto] = useState('')
  const { estado: busqueda, reintentar: reintentarBusqueda } = useBusquedaDeLaPaleta({
    texto,
    abierta,
  })
  const { estado: ultimos, reintentar: reintentarUltimos } = useUltimosAbiertos({ abierta })
  const queCoinciden = useMemo(() => filtrarAcciones(acciones, texto), [acciones, texto])
  // «Ver todos en Leads» lleva el texto como lo entendió la búsqueda (`#12` queda `#12`), no el crudo con sus espacios de más.
  const interpretado = useMemo(() => interpretarBusqueda(texto), [texto])
  const textoDeVerTodos =
    interpretado === null ? null : `${interpretado.soloNumero ? '#' : ''}${interpretado.texto}`

  const cerrar = () => {
    setTexto('')
    alCambiar(false)
  }

  const elegir = (destino: DestinoDeLaAccion) => {
    cerrar()
    switch (destino.tipo) {
      case 'ruta':
        router.push(destino.ruta as Route)
        return
      case 'nuevo-lead':
        setTimeout(alAbrirNuevoLead, DESPUES_DE_CERRAR_MS)
        return
      case 'atajos':
        setTimeout(alVerAtajos, DESPUES_DE_CERRAR_MS)
        return
    }
  }

  return (
    <CommandDialog
      open={abierta}
      onOpenChange={(siguiente) => {
        if (!siguiente) {
          cerrar()
        }
      }}
      title="Buscar"
      description="Busca leads, vehículos y cotizaciones, o ejecuta una acción."
      className="max-w-[calc(100%-2rem)] sm:max-w-lg"
    >
      <Command shouldFilter={false} label="Buscar">
        <CommandInput
          value={texto}
          onValueChange={setTexto}
          aria-label="Buscar"
          placeholder="Buscar leads, vehículos, cotizaciones o acciones"
        />
        <CommandList className="max-h-72">
          <CuerpoDeLaPaleta
            texto={texto}
            acciones={queCoinciden}
            busqueda={busqueda}
            ultimos={ultimos}
            textoDeVerTodos={textoDeVerTodos}
            alReintentarBusqueda={reintentarBusqueda}
            alReintentarUltimos={reintentarUltimos}
            alElegir={elegir}
          />
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
