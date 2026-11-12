'use client'

import { useId } from 'react'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'

type Props = {
  texto: string
  // Por qué no se puede guardar, junto al campo.
  motivo: string | null
  alEscribir: (valor: string) => void
}

// El texto del mensaje del portal, con las variables que admite y el rechazo junto al campo.
export function CampoDelMensaje({ texto, motivo, alEscribir }: Props) {
  const idCampo = useId()
  const idAyuda = useId()
  const idMotivo = useId()
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={idCampo}>Texto para WhatsApp</Label>
      <Textarea
        id={idCampo}
        value={texto}
        rows={8}
        maxLength={4000}
        aria-invalid={motivo ? true : undefined}
        aria-describedby={motivo ? `${idMotivo} ${idAyuda}` : idAyuda}
        onChange={(evento) => {
          alEscribir(evento.target.value)
        }}
      />
      {motivo ? (
        <p id={idMotivo} className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {motivo}
        </p>
      ) : null}
      <p id={idAyuda} className="text-(length:--text-xs) text-(--color-ink-soft)">
        Usa {'{cliente}'}, {'{empresa}'}, {'{codigo}'}, {'{clave}'} y {'{direccion}'}. {'{codigo}'}{' '}
        y {'{clave}'} son obligatorias.
      </p>
    </div>
  )
}
