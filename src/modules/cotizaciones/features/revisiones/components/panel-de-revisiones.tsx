'use client'

import { HistoryIcon } from 'lucide-react'
import type { RefObject } from 'react'
import { textoDelTope } from '@/shared/lib/conteo'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { Drawer } from '@/shared/ui/drawer'
import { EstadoError, EstadoVacio } from '@/shared/ui/estados'
import { useRevisiones } from '../hooks/use-revisiones'
import { EsqueletoDeRevisiones } from './esqueleto-de-revisiones'
import { Revision } from './revision'

type Props = {
  abierto: boolean
  alCerrar: () => void
  cotizacionId: string
  numero: number
  // La versión de la cotización (`actualizadoEn`): con otra, lo leído era de la anterior y se vuelve a leer.
  version: string
  // El botón «Revisiones»: el foco vuelve a él al cerrar, también si el panel se abrió por la URL.
  botonDeRevisiones: RefObject<HTMLButtonElement | null>
}

// Las revisiones de una cotización guardada (4.15-3b): un panel de sólo lectura con su URL (`?panel=revisiones`). Se monta la primera vez que se abre (`useAbiertoAlgunaVez`) y
// desde ahí conserva lo leído: cerrarlo y abrirlo no vuelve a pedir lo mismo.
export function PanelDeRevisiones({
  abierto,
  alCerrar,
  cotizacionId,
  numero,
  version,
  botonDeRevisiones,
}: Props) {
  const revisiones = useRevisiones({ cotizacionId, version, abierto })
  return (
    <Drawer
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={`Revisiones de la cotización n.º ${String(numero)}`}
      focoAlCerrar={() => botonDeRevisiones.current ?? true}
    >
      <Contenido revisiones={revisiones} />
    </Drawer>
  )
}

function Contenido({ revisiones }: { revisiones: ReturnType<typeof useRevisiones> }) {
  if (!revisiones.leido) {
    return revisiones.error ? (
      <div role="alert">
        <EstadoError
          titulo="No se pudieron cargar las revisiones."
          alReintentar={revisiones.reintentar}
        />
      </div>
    ) : (
      <EsqueletoDeRevisiones />
    )
  }
  if (revisiones.revisiones.length === 0) {
    return <EstadoVacio Icono={HistoryIcon} titulo="Todavía no tiene cambios guardados." compacto />
  }
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
      <ul aria-label="Revisiones" className="grid grid-cols-[minmax(0,1fr)] gap-2">
        {revisiones.revisiones.map((revision) => (
          <Revision key={revision.id} revision={revision} etiquetas={revisiones.etiquetas.nodos} />
        ))}
      </ul>
      {revisiones.error ? (
        <div role="alert" className="flex flex-wrap items-center gap-2">
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            No se pudieron cargar más.
          </p>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 md:min-h-9"
            onClick={revisiones.reintentar}
          >
            Reintentar
          </Button>
        </div>
      ) : revisiones.enElTope ? (
        <AvisoDeTope texto={textoDelTope(TOPE_DE_LO_CARGADO, { articulo: 'las' })} />
      ) : revisiones.hayMasParaPedir ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 md:min-h-9"
          disabled={revisiones.cargandoMas}
          onClick={revisiones.verMas}
        >
          {revisiones.cargandoMas ? 'Cargando…' : 'Ver más'}
        </Button>
      ) : null}
    </div>
  )
}
