'use client'

import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { caracteres } from '../../../entities/plantilla/json-de-la-base'

type Props = {
  // Sirve de `id` y de `name`.
  nombre: string
  // Dónde del rechazo de la plantilla (`etiquetas.fees`): el foco va al primer campo con motivo.
  donde: string
  etiqueta: string
  valor: string
  tope: number
  placeholder?: string
  multilinea?: boolean
  motivo?: string
  deshabilitado?: boolean
  alCambiar: (valor: string) => void
}

// Un campo de texto de la plantilla con «n de <tope>». Cuenta caracteres de verdad (`caracteres()`: un emoji es uno) y **no lleva `maxLength`**, que cuenta unidades UTF-16
// (4-74): el tope lo dice la forma y el motivo sale junto al campo.
export function CampoConContador({
  nombre,
  donde,
  etiqueta,
  valor,
  tope,
  placeholder,
  multilinea = false,
  motivo,
  deshabilitado,
  alCambiar,
}: Props) {
  const idError = `${nombre}-error`
  const idCuenta = `${nombre}-cuenta`
  const comunes = {
    id: nombre,
    name: nombre,
    value: valor,
    placeholder,
    disabled: deshabilitado,
    'data-campo': donde,
    'aria-invalid': motivo ? (true as const) : undefined,
    'aria-describedby': motivo ? `${idError} ${idCuenta}` : idCuenta,
  }
  return (
    <div className="grid min-w-0 gap-1.5">
      <Label htmlFor={nombre}>{etiqueta}</Label>
      {multilinea ? (
        <Textarea
          rows={3}
          {...comunes}
          onChange={(evento) => {
            alCambiar(evento.target.value)
          }}
        />
      ) : (
        <Input
          className="h-11 md:h-9"
          {...comunes}
          onChange={(evento) => {
            alCambiar(evento.target.value)
          }}
        />
      )}
      {motivo ? (
        <p id={idError} className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {motivo}
        </p>
      ) : null}
      <p id={idCuenta} className="text-(length:--text-sm) text-(--color-ink-faint)">
        {caracteres(valor)} de {tope}
      </p>
    </div>
  )
}
