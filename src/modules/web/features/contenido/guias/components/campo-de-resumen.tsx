'use client'

import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { MAXIMO_DEL_RESUMEN_DE_GUIA } from '../../../../entities/contenido/guias'

type Props = { valor: string; alCambiar: (resumen: string) => void; error: string | undefined }

// El resumen de la guía: lo que se ve en la lista del sitio, con su cuenta de letras.
export function CampoDeResumen({ valor, alCambiar, error }: Props) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor="resumen">Resumen</Label>
      <Textarea
        id="resumen"
        name="resumen"
        maxLength={MAXIMO_DEL_RESUMEN_DE_GUIA}
        value={valor}
        aria-invalid={error ? true : undefined}
        onChange={(evento) => {
          alCambiar(evento.target.value)
        }}
      />
      <p className="text-(length:--text-sm) text-(--color-ink-faint)">
        {valor.length} de {MAXIMO_DEL_RESUMEN_DE_GUIA} letras. Se ve en la lista de guías del sitio.
      </p>
      {error ? <p className="text-(length:--text-sm) text-(--color-peligro-ink)">{error}</p> : null}
    </div>
  )
}
