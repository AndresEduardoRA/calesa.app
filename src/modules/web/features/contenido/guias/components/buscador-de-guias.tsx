'use client'

import { SearchIcon } from 'lucide-react'
import { parseAsString, useQueryState } from 'nuqs'
import { useEffect, useState } from 'react'
import { cumpleElMinimo } from '@/shared/lib/filtros'
import { Input } from '@/shared/ui/input'
import { MINIMO_DE_BUSQUEDA_DE_GUIAS } from '../../../../entities/contenido/guias'

const ESPERA_MS = 350

// Buscar guías por título: va a la URL (`?q=`) un momento después de dejar de tipear y el servidor vuelve a leer la lista. Con menos letras
// de las que pide el mínimo no busca y lo dice.
export function BuscadorDeGuias() {
  const [enUrl, setEnUrl] = useQueryState('q', parseAsString.withOptions({ shallow: false }))
  const [texto, setTexto] = useState(enUrl ?? '')
  const deseada = cumpleElMinimo(texto, MINIMO_DE_BUSQUEDA_DE_GUIAS) ? texto.trim() : null
  const aplicada = enUrl === null || enUrl === '' ? null : enUrl

  useEffect(() => {
    if (deseada === aplicada) {
      return
    }
    const espera = setTimeout(() => {
      void setEnUrl(deseada)
    }, ESPERA_MS)
    return () => {
      clearTimeout(espera)
    }
  }, [deseada, aplicada, setEnUrl])

  const corto = texto.trim() !== '' && deseada === null
  return (
    <div className="grid gap-1">
      <label htmlFor="buscar-guias" className="sr-only">
        Buscar guías por título
      </label>
      <div className="relative">
        <SearchIcon
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-(--color-ink-faint)"
        />
        <Input
          id="buscar-guias"
          type="search"
          placeholder="Buscar por título"
          autoComplete="off"
          className="h-11 w-full pl-8 sm:w-72 md:h-9"
          value={texto}
          onChange={(evento) => {
            setTexto(evento.target.value)
          }}
        />
      </div>
      {corto ? (
        <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
          {MINIMO_DE_BUSQUEDA_DE_GUIAS.aviso}
        </p>
      ) : null}
    </div>
  )
}
