'use client'

import { PlusIcon } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import { Button } from '@/shared/ui/button'
import { useTextoDeUrl } from '@/shared/ui/filtros/use-texto-de-url'
import { Input } from '@/shared/ui/input'

type Props = {
  // Lo que dice `?buscar=`.
  textoDeUrl: string
  // Lo que el texto no alcanza a decir (el mínimo, un enlace que no es de una subasta o que no se puede traer): va debajo, enlazado al campo.
  aviso: string | null
  alCambiar: (texto: string) => void
  // «+», «Cargar a mano»: sólo si quien mira puede dar de alta en el origen.
  alCargarAMano: (() => void) | null
  // Si desde este origen se puede traer de la subasta (el campo lo dice en su etiqueta).
  conTraer: boolean
  // El botón de lo que el texto trae («Traer el lote 58540656»); null = nada que traer.
  etiquetaDeTraer: string | null
  // Lo tipeado en este instante (puede ir adelante de la URL) y si fue Enter. Quien lo recibe decide si trae.
  alTraer: (texto: string, porEnter: boolean) => void
}

const IGUAL = (texto: string) => texto

// El campo de arriba del panel del vehículo: lo escrito busca en el título, el VIN y el lote de los vehículos del origen y, si es un enlace de
// subasta, un VIN o un lote, se puede traer de ella. Lo escrito vive también en la URL, así que el campo lleva `useTextoDeUrl()`: sin él, la vuelta
// de la URL le quita el foco a media palabra. Al montarse toma el foco: el panel abre ahí, y al volver del alta también.
export function BuscadorDelPanel(props: Props) {
  const { textoDeUrl, aviso, alCambiar, alCargarAMano, conTraer, etiquetaDeTraer, alTraer } = props
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
        {conTraer ? 'Buscar o traer un vehículo' : 'Buscar un vehículo'}
      </label>
      <div className="flex min-w-0 items-center gap-2">
        <Input
          ref={campo}
          id={id}
          type="search"
          autoComplete="off"
          placeholder={conTraer ? 'Enlace, lote, VIN o nombre' : 'Nombre, VIN o lote'}
          aria-describedby={aviso ? idDelAviso : undefined}
          className="h-11 min-w-0 flex-1 md:h-9"
          value={texto}
          onChange={(evento) => {
            setTexto(evento.target.value)
            alCambiar(evento.target.value)
          }}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter') {
              alTraer(texto, true)
            }
          }}
        />
        {alCargarAMano ? (
          <Button
            type="button"
            variant="outline"
            aria-label="Cargar a mano"
            title="Cargar a mano"
            className="h-[44px] w-[44px] shrink-0 p-0 md:h-9 md:w-9"
            onClick={alCargarAMano}
          >
            <PlusIcon aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      {aviso ? (
        <p id={idDelAviso} role="status" className="text-xs text-(--color-ink-soft)">
          {aviso}
        </p>
      ) : null}
      {etiquetaDeTraer ? (
        <div>
          <Button
            type="button"
            variant="outline"
            className="h-11 max-w-full md:h-9"
            onClick={() => {
              alTraer(texto, false)
            }}
          >
            <span className="truncate">{etiquetaDeTraer}</span>
          </Button>
        </div>
      ) : null}
    </div>
  )
}
