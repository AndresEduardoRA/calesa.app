'use client'

import { Button } from '@/shared/ui/button'
import type { EstadoDeLaBusqueda } from './use-busqueda-cancelable'

type Props = {
  estado: EstadoDeLaBusqueda
  // Hay algo escrito pero no alcanza para buscar.
  faltaTexto: boolean
  avisoDelMinimo: string
  // Se está buscando con un texto que alcanza.
  buscaConTexto: boolean
  error?: string
  alReintentar: () => void
}

function textoDelEstado({
  estado,
  faltaTexto,
  avisoDelMinimo,
  buscaConTexto,
}: Props): string | null {
  if (faltaTexto) return avisoDelMinimo
  if (!buscaConTexto) return null
  if (estado.tipo === 'buscando') return 'Buscando…'
  return estado.tipo === 'listo' && estado.opciones.length === 0 ? 'No encontramos nada.' : null
}

// Lo que dice un buscador debajo del campo: el mínimo, «Buscando…», «No encontramos nada.», el error de la búsqueda con «Reintentar» y el del formulario.
export function AvisosDelBuscador(props: Props) {
  return (
    <>
      <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
        {textoDelEstado(props)}
      </p>
      {props.estado.tipo === 'error' ? (
        <p className="flex flex-wrap items-center gap-2 text-(length:--text-sm) text-(--color-peligro-ink)">
          No se pudo buscar.
          <Button type="button" variant="outline" size="sm" onClick={props.alReintentar}>
            Reintentar
          </Button>
        </p>
      ) : null}
      {props.error ? (
        <p className="text-(length:--text-sm) text-(--color-peligro-ink)">{props.error}</p>
      ) : null}
    </>
  )
}
