'use client'

import { PencilIcon, PlusIcon } from 'lucide-react'
import { concordar, type OrigenResumen } from '@/modules/origenes/client'
import { Button } from '@/shared/ui/button'
import type { PermisoDeAlta } from '../../../entities/permisos'
import { usePanelDeVehiculo } from '../hooks/use-panel-de-vehiculo'

// El id del aviso que explica por qué «Nuevo» está apagado (lo dibuja el listado).
export const ID_DEL_MOTIVO_DE_ALTA = 'motivo-de-alta'

type PropsDeNuevo = {
  origen: OrigenResumen
  permiso: PermisoDeAlta
}

// «Nuevo <lo que entra por este origen>». Sin el permiso no existe; con el origen desactivado se
// ve apagado y apunta al motivo.
export function BotonNuevoVehiculo({ origen, permiso }: PropsDeNuevo) {
  const panel = usePanelDeVehiculo()
  if (permiso.estado === 'oculto') {
    return null
  }
  const apagado = permiso.estado === 'deshabilitado'
  return (
    <Button
      className="h-11 md:h-9"
      onClick={panel.abrirNuevo}
      disabled={apagado}
      aria-describedby={apagado ? ID_DEL_MOTIVO_DE_ALTA : undefined}
    >
      <PlusIcon aria-hidden />
      {concordar(origen.genero, { m: 'Nuevo', f: 'Nueva' })} {origen.sustantivo}
    </Button>
  )
}

type PropsDeEditar = {
  vehiculo: { id: string; titulo: string }
  // En una fila de la lista va sólo el ícono; en la ficha, con su texto.
  compacto?: boolean
}

export function BotonEditarVehiculo({ vehiculo, compacto = false }: PropsDeEditar) {
  const panel = usePanelDeVehiculo()
  if (compacto) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        className="size-11 md:size-7"
        aria-label={`Editar ${vehiculo.titulo}`}
        onClick={() => {
          panel.editar(vehiculo.id)
        }}
      >
        <PencilIcon aria-hidden />
      </Button>
    )
  }
  return (
    <Button
      variant="outline"
      className="h-11 md:h-9"
      onClick={() => {
        panel.editar(vehiculo.id)
      }}
    >
      <PencilIcon aria-hidden />
      Editar
    </Button>
  )
}
