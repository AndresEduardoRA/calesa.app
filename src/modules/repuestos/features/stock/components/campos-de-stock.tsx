'use client'

import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { MAXIMO_DE_NOTA_DE_STOCK } from '../../../entities/stock/reglas'

type PropsDelCampo = {
  id: string
  valor: string
  error: string | undefined
  disabled: boolean
  alEscribir: (texto: string) => void
}

export function ErrorDelCampo({ id, texto }: { id: string; texto: string | undefined }) {
  return texto ? (
    <p id={id} className="text-(length:--text-sm) text-(--color-peligro-ink)">
      {texto}
    </p>
  ) : null
}

// «Cantidad» de un movimiento de stock (8.10-3): un entero, a lo ancho de un número.
export function CampoDeCantidad({ id, valor, error, disabled, alEscribir }: PropsDelCampo) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>Cantidad</Label>
      <Input
        id={id}
        name="cantidad"
        inputMode="numeric"
        autoComplete="off"
        value={valor}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        disabled={disabled}
        className="max-w-40 tabular-nums"
        onChange={(evento) => {
          alEscribir(evento.target.value)
        }}
      />
      <ErrorDelCampo id={`${id}-error`} texto={error} />
    </div>
  )
}

// «Nota» opcional de un movimiento de stock, hasta 500.
export function CampoDeNota({ id, valor, error, disabled, alEscribir }: PropsDelCampo) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>Nota</Label>
      <Textarea
        id={id}
        name="nota"
        value={valor}
        maxLength={MAXIMO_DE_NOTA_DE_STOCK + 100}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        disabled={disabled}
        onChange={(evento) => {
          alEscribir(evento.target.value)
        }}
      />
      <ErrorDelCampo id={`${id}-error`} texto={error} />
    </div>
  )
}
