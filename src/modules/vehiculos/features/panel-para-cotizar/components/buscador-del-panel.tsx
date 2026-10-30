'use client'

import { useId } from 'react'
import { Input } from '@/shared/ui/input'
import { useTextoDeUrl } from '@/shared/ui/filtros/use-texto-de-url'

type Props = {
  // Lo que dice `?buscar=`.
  textoDeUrl: string
  // Lo que el texto no alcanza a decir (el mínimo, un enlace que no es de una subasta): va debajo, enlazado al campo.
  aviso: string | null
  alCambiar: (texto: string) => void
}

const IGUAL = (texto: string) => texto

// El campo de arriba del panel del vehículo: lo escrito busca en el título, el VIN y el lote de los vehículos del origen. Lo escrito vive
// también en la URL, así que el campo lleva `useTextoDeUrl()`: sin él, la vuelta de la URL le quita el foco a media palabra.
export function BuscadorDelPanel({ textoDeUrl, aviso, alCambiar }: Props) {
  const id = useId()
  const idDelAviso = useId()
  const [texto, setTexto] = useTextoDeUrl(textoDeUrl, IGUAL)
  return (
    <div className="grid min-w-0 gap-1.5">
      <label htmlFor={id} className="text-(length:--text-sm) font-medium text-(--color-ink)">
        Buscar un vehículo
      </label>
      <Input
        id={id}
        type="search"
        autoComplete="off"
        placeholder="Nombre, VIN o lote"
        aria-describedby={aviso ? idDelAviso : undefined}
        className="h-11 md:h-9"
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
