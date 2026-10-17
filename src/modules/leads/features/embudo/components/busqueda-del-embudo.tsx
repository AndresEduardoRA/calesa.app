'use client'

import { SearchIcon } from 'lucide-react'
import { parseAsString, useQueryState } from 'nuqs'
import { useEffect, useState } from 'react'
import { Input } from '@/shared/ui/input'
import { useEnLinea } from '@/shared/ui/use-en-linea'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import { CLAVE_DE_BUSQUEDA_DEL_EMBUDO, busquedaDelEmbudo } from '../../../entities/tablero'

export const ID_DE_LA_BUSQUEDA_DEL_EMBUDO = 'busqueda-del-embudo'

const ESPERA_MS = 350

// «Buscar en el embudo» (cierre 1): el título de la oportunidad o el nombre del lead, en todas las columnas. Va a la URL
// (`?q=`) un momento después de dejar de tipear y el servidor vuelve a leer el tablero; con menos de 2 caracteres no busca.
// Sin red no navega (dejaría la pantalla en blanco): lo dice y se aplica solo al volver la conexión.
export function BusquedaDelEmbudo() {
  const [enUrl, setEnUrl] = useQueryState(
    CLAVE_DE_BUSQUEDA_DEL_EMBUDO,
    parseAsString.withOptions({ shallow: false }),
  )
  const [texto, setTexto] = useState(enUrl ?? '')
  const enLinea = useEnLinea()
  const deseada = busquedaDelEmbudo(texto)
  const aplicada = busquedaDelEmbudo(enUrl)
  const [pendiente, setPendiente] = useState<string | null>(null)

  useEffect(() => {
    if (deseada === aplicada) {
      return
    }
    const espera = setTimeout(() => {
      if (!navigator.onLine) {
        setPendiente(deseada ?? '')
        return
      }
      void setEnUrl(deseada)
    }, ESPERA_MS)
    return () => {
      clearTimeout(espera)
    }
  }, [deseada, aplicada, setEnUrl])

  useReintentoAlVolver(pendiente, async (valor) => {
    setPendiente(null)
    await setEnUrl(valor === '' ? null : valor)
    return true
  })

  return (
    <div className="grid gap-1">
      <label htmlFor={ID_DE_LA_BUSQUEDA_DEL_EMBUDO} className="sr-only">
        Buscar en el embudo
      </label>
      <div className="relative">
        <SearchIcon
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-(--color-ink-faint)"
        />
        <Input
          id={ID_DE_LA_BUSQUEDA_DEL_EMBUDO}
          type="search"
          placeholder="Buscar en el embudo"
          className="h-11 w-full pl-8 sm:w-64 md:h-9"
          value={texto}
          onChange={(evento) => {
            setTexto(evento.target.value)
          }}
        />
      </div>
      {pendiente !== null && !enLinea ? (
        <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
          Sin conexión: la búsqueda se aplica cuando vuelva la red.
        </p>
      ) : null}
    </div>
  )
}
