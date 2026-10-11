'use client'

import { useId } from 'react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { avisarError, avisarExito } from '@/shared/ui/toasts'

// El enlace con el que la persona invitada elige su contraseña, listo para copiar y pasarlo por
// donde convenga. Sólo hay uno vigente: generar otro deja a este sin efecto.
export function EnlaceInvitacion({ enlace }: { enlace: string }) {
  const id = useId()

  async function copiar() {
    try {
      await navigator.clipboard.writeText(enlace)
      avisarExito('Enlace copiado')
    } catch {
      // Sin permiso para el portapapeles (o en http): queda seleccionarlo a mano.
      avisarError({
        codigo: 'inesperado',
        mensaje: 'No se pudo copiar. Selecciona el enlace y cópialo a mano.',
      })
    }
  }

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>Enlace de invitación</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          readOnly
          value={enlace}
          className="h-11 min-w-0 flex-1 font-mono text-(length:--text-xs) md:h-9"
          onFocus={(evento) => {
            evento.target.select()
          }}
        />
        <Button variant="outline" className="h-11 md:h-9" onClick={() => void copiar()}>
          Copiar
        </Button>
      </div>
      <p className="text-(length:--text-sm) text-(--color-ink-faint)">
        Sirve una sola vez y vence pronto. Pásaselo sólo a esa persona: quien lo abre elige la
        contraseña de la cuenta.
      </p>
    </div>
  )
}
