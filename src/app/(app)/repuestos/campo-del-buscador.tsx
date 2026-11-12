'use client'

import type { KeyboardEvent, Ref } from 'react'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

type Props = {
  nombre: string
  etiqueta: string
  marcador: string
  texto: string
  entrada: Ref<HTMLInputElement>
  idLista: string
  idActiva: string | undefined
  hayLista: boolean
  error?: string
  disabled: boolean
  alEscribir: (texto: string) => void
  alTeclear: (evento: KeyboardEvent) => void
}

// El campo de un combobox: el texto y lo que el lector de pantalla necesita saber de la lista que gobierna.
export function CampoDelBuscador({
  nombre,
  etiqueta,
  marcador,
  texto,
  entrada,
  idLista,
  idActiva,
  hayLista,
  error,
  disabled,
  alEscribir,
  alTeclear,
}: Props) {
  return (
    <>
      <Label htmlFor={nombre}>{etiqueta}</Label>
      <Input
        ref={entrada}
        id={nombre}
        name={nombre}
        role="combobox"
        aria-expanded={hayLista}
        aria-controls={idLista}
        aria-autocomplete="list"
        aria-activedescendant={idActiva}
        aria-invalid={error ? true : undefined}
        autoComplete="off"
        className="h-11 md:h-9"
        placeholder={marcador}
        disabled={disabled}
        value={texto}
        onChange={(evento) => {
          alEscribir(evento.target.value)
        }}
        onKeyDown={alTeclear}
      />
    </>
  )
}
