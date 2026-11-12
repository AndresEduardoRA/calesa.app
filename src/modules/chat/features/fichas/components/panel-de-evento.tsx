'use client'

import { useCallback, useId } from 'react'
import { CambiosSinGuardar } from '@/shared/ui/cambios-sin-guardar'
import { Drawer } from '@/shared/ui/drawer'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'
import { leerMiembrosParaInvitar } from '../../../composicion.client'
import { useFormularioDeEvento } from '../hooks/use-formulario-de-evento'
import { CamposDeEvento } from './campos-de-evento'
import type { PropsDePanelDeFicha } from './props-de-panel'

// «Nuevo evento» desde el chat (`?panel=evento`): título, cuándo empieza e invitados entre los miembros. Con `agenda.eventos.publicar` es un evento para
// las personas elegidas; sin él, privado (sólo lo ve quien lo crea) y sin invitados, porque la base no deja otra cosa.
export function PanelDeEvento({
  abierto,
  alCerrar,
  conversacion,
  usuarioId,
  zona,
  titulo,
  puedePublicar,
  alCrear,
}: PropsDePanelDeFicha & { puedePublicar: boolean }) {
  const idFormulario = useId()
  const f = useFormularioDeEvento({
    conversacion: conversacion.id,
    zona,
    titulo,
    invitadaDePartida: conversacion.otro
      ? { id: conversacion.otro.id, nombre: conversacion.otro.nombre ?? 'Persona' }
      : null,
    puedePublicar,
    alCrear,
  })
  const leer = useCallback(
    (texto: string) => leerMiembrosParaInvitar(texto, conversacion.id, usuarioId),
    [conversacion.id, usuarioId],
  )
  return (
    <Drawer
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Nuevo evento"
      pie={
        <PieDelPanel
          idFormulario={idFormulario}
          enCurso={f.enCurso}
          alCancelar={alCerrar}
          etiquetaDeGuardar="Crear evento"
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
          void f.enviar()
        }}
      >
        <CamposDeEvento formulario={f} leer={leer} />
        {f.aviso !== null ? (
          <p role="alert" className="text-(length:--text-sm) text-(--color-peligro-ink)">
            {f.aviso}
          </p>
        ) : null}
      </form>
    </Drawer>
  )
}
