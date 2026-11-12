'use client'

import { useState } from 'react'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/textarea'
import type { Mensaje } from '../../../entities/mensajes'
import type { AccionesDelMensaje } from '../acciones-del-hilo'

// El editor dentro de la burbuja, en lugar del texto. Enter guarda, Mayús+Enter salta de línea, Esc cancela. «Guardar» se apaga con el texto vacío,
// sin cambios o mientras guarda (nunca un doble envío). El error de la base va debajo y el texto se conserva.
export function EditarEnLinea({
  mensaje,
  acciones,
}: {
  mensaje: Mensaje
  acciones: AccionesDelMensaje
}) {
  const original = mensaje.cuerpo ?? ''
  const [texto, setTexto] = useState(original)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sinCambios = texto.trim() === original.trim()
  const puedeGuardar = texto.trim() !== '' && !sinCambios && !guardando

  async function guardar() {
    if (!puedeGuardar) {
      return
    }
    setGuardando(true)
    setError(null)
    const resultado = await acciones.guardarEdicion(mensaje, texto)
    // Si salió bien el editor se desmonta; sólo si falló sigue y habla.
    if (!resultado.ok) {
      setGuardando(false)
      setError(resultado.mensaje)
    }
  }

  return (
    <div className="grid min-w-0 gap-2">
      <Textarea
        autoFocus
        aria-label="Editar mensaje"
        rows={2}
        value={texto}
        aria-invalid={error ? true : undefined}
        className="max-h-40 min-h-11 resize-none"
        onChange={(evento) => {
          setTexto(evento.target.value)
          setError(null)
        }}
        onKeyDown={(evento) => {
          if (evento.key === 'Enter' && !evento.shiftKey && !evento.nativeEvent.isComposing) {
            evento.preventDefault()
            void guardar()
          } else if (evento.key === 'Escape') {
            evento.preventDefault()
            acciones.cancelarEdicion()
          }
        }}
      />
      {error ? (
        <p role="alert" className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 md:min-h-8"
          onClick={acciones.cancelarEdicion}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          className="min-h-11 md:min-h-8"
          disabled={!puedeGuardar}
          onClick={() => {
            void guardar()
          }}
        >
          Guardar
        </Button>
      </div>
    </div>
  )
}
