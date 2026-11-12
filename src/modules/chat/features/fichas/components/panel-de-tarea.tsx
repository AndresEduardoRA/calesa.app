'use client'

import { useCallback, useId } from 'react'
import { leerPersonasParaTarea } from '@/modules/agenda/client'
import { CambiosSinGuardar } from '@/shared/ui/cambios-sin-guardar'
import { Drawer } from '@/shared/ui/drawer'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'
import { useFormularioDeTarea } from '../hooks/use-formulario-de-tarea'
import { CamposDeTarea } from './campos-de-tarea'
import type { PropsDePanelDeFicha } from './props-de-panel'

// «Nueva tarea» desde el chat (`?panel=tarea`): título, vencimiento opcional y responsable. La tarea nace ligada a la conversación y deja su ficha en el
// hilo. En una directa la otra persona viene elegida; sin `agenda.tareas.asignar` la tarea es de quien la crea.
export function PanelDeTarea({
  abierto,
  alCerrar,
  conversacion,
  zona,
  titulo,
  puedeAsignar,
  alCrear,
}: PropsDePanelDeFicha & { puedeAsignar: boolean }) {
  const idFormulario = useId()
  const f = useFormularioDeTarea({
    conversacion: conversacion.id,
    zona,
    titulo,
    responsableDePartida: conversacion.otro
      ? { id: conversacion.otro.id, nombre: conversacion.otro.nombre ?? 'Persona' }
      : null,
    puedeAsignar,
    alCrear,
  })
  // Estable: el selector relee si cambia la función.
  const leer = useCallback(
    (texto: string) => leerPersonasParaTarea(texto, conversacion.id),
    [conversacion.id],
  )
  return (
    <Drawer
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Nueva tarea"
      pie={
        <PieDelPanel
          idFormulario={idFormulario}
          enCurso={f.enCurso}
          alCancelar={alCerrar}
          etiquetaDeGuardar="Crear tarea"
          etiquetaEnCurso="Creando…"
        />
      }
    >
      <CambiosSinGuardar hayCambios={f.hayCambios} />
      <form
        id={idFormulario}
        className="grid grid-cols-[minmax(0,1fr)] gap-4"
        noValidate
        onSubmit={(evento) => {
          evento.preventDefault()
          void f.enviar(new Date().toISOString())
        }}
      >
        <CamposDeTarea formulario={f} leer={leer} />
        {f.aviso !== null ? (
          <p role="alert" className="text-(length:--text-sm) text-(--color-peligro-ink)">
            {f.aviso}
          </p>
        ) : null}
      </form>
    </Drawer>
  )
}
