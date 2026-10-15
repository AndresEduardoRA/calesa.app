'use client'

import { PhoneIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { usePanelDeLead } from '../hooks/use-panel-de-lead'

// «Cambiar» el teléfono principal. Con la edición de la ficha abierta se deshabilita y dice por qué:
// cambiar el número mueve la versión del lead y dejaría esa edición con la vieja.
export function BotonCambiarTelefono() {
  const panel = usePanelDeLead()
  const bloqueado = panel.abierto
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2">
      <Button
        variant="ghost"
        size="sm"
        className="min-h-11 md:min-h-7"
        disabled={bloqueado}
        aria-describedby={bloqueado ? 'cambiar-telefono-motivo' : undefined}
        onClick={panel.telefono.abrir}
      >
        <PhoneIcon aria-hidden />
        Cambiar
      </Button>
      {bloqueado ? (
        <span
          id="cambiar-telefono-motivo"
          className="text-(length:--text-xs) text-(--color-ink-soft)"
        >
          Termina o cierra la edición para cambiarlo.
        </span>
      ) : null}
    </span>
  )
}
