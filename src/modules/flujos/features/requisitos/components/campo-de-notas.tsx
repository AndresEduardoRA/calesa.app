'use client'

import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { LARGO_MAXIMO_DE_LAS_NOTAS } from '../../../entities/requisitos/notas'

type Props = {
  valor: string
  error: string | undefined
  alEscribir: (notas: string) => void
}

const ID = 'notas'

// Las notas de un requisito (opcionales, hasta 500 caracteres), con su motivo junto al campo.
export function CampoDeNotas({ valor, error, alEscribir }: Props) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={ID}>Notas (opcional)</Label>
      <Textarea
        id={ID}
        name={ID}
        rows={2}
        maxLength={LARGO_MAXIMO_DE_LAS_NOTAS + 20}
        value={valor}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${ID}-error` : undefined}
        onChange={(evento) => {
          alEscribir(evento.target.value)
        }}
      />
      {error ? (
        <p id={`${ID}-error`} className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {error}
        </p>
      ) : null}
    </div>
  )
}
