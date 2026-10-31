'use client'

import { useEffect, useId, useRef } from 'react'
import { useTextoDeUrl } from '@/shared/ui/filtros/use-texto-de-url'
import { Input } from '@/shared/ui/input'

type Props = {
  // Lo que dice `?buscar=`.
  textoDeUrl: string
  // Lo que el texto no alcanza a decir (el mínimo): va debajo, enlazado al campo.
  aviso: string | null
  alCambiar: (texto: string) => void
}

const IGUAL = (texto: string) => texto

// El campo de arriba del panel del cliente: lo escrito busca por nombre o por número («#124») entre los leads que quien mira ve. Lo escrito vive también en la
// URL, así que el campo lleva `useTextoDeUrl()`: sin él, la vuelta de la URL le quita el foco a media palabra. Al montarse toma el foco: el panel abre ahí.
export function BuscadorDeClientes({ textoDeUrl, aviso, alCambiar }: Props) {
  const id = useId()
  const idDelAviso = useId()
  const campo = useRef<HTMLInputElement>(null)
  const [texto, setTexto] = useTextoDeUrl(textoDeUrl, IGUAL)
  useEffect(() => {
    campo.current?.focus()
  }, [])
  return (
    <div className="grid min-w-0 gap-1.5">
      <label htmlFor={id} className="text-(length:--text-sm) font-medium text-(--color-ink)">
        Buscar por nombre o número
      </label>
      <Input
        ref={campo}
        id={id}
        type="search"
        autoComplete="off"
        placeholder="Nombre o #número"
        aria-describedby={aviso ? idDelAviso : undefined}
        className="h-11 min-w-0 md:h-9"
        value={texto}
        onChange={(evento) => {
          setTexto(evento.target.value)
          alCambiar(evento.target.value)
        }}
      />
      {aviso ? (
        <p id={idDelAviso} role="status" className="text-xs text-(--color-ink-soft)">
          {aviso}
        </p>
      ) : null}
    </div>
  )
}
