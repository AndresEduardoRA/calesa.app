'use client'

import { HistoryIcon } from 'lucide-react'
import type { RefObject } from 'react'
import { DesdeUnaFecha } from '@/shared/ui/desde-una-fecha'
import { Drawer } from '@/shared/ui/drawer'
import { EstadoError, EstadoVacio } from '@/shared/ui/estados'
import { useRegional } from '@/shared/ui/regional'
import { useRevisiones } from '../hooks/use-revisiones'
import { EsqueletoDeRevisiones } from './esqueleto-de-revisiones'
import { PieDeRevisiones } from './pie-de-revisiones'
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
  const { zonaHoraria } = useRegional()
  return (
    <Drawer
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={`Revisiones de la cotización n.º ${String(numero)}`}
      focoAlCerrar={() => botonDeRevisiones.current ?? true}
    >
      <Contenido revisiones={revisiones} zona={zonaHoraria} />
    </Drawer>
  )
}

function Contenido({
  revisiones,
  zona,
}: {
  revisiones: ReturnType<typeof useRevisiones>
  zona: string
}) {
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
  if (revisiones.revisiones.length === 0 && revisiones.desde === null) {
    return <EstadoVacio Icono={HistoryIcon} titulo="Todavía no tiene cambios guardados." compacto />
  }
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
      <DesdeLaFecha revisiones={revisiones} zona={zona} />
      {revisiones.revisiones.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-faint)">
          No hay revisiones hasta esa fecha.
        </p>
      ) : (
        <ul aria-label="Revisiones" className="grid grid-cols-[minmax(0,1fr)] gap-2">
          {revisiones.revisiones.map((revision) => (
            <Revision
              key={revision.id}
              revision={revision}
              etiquetas={revisiones.etiquetas.nodos}
            />
          ))}
        </ul>
      )}
      <PieDeRevisiones revisiones={revisiones} zona={zona} />
    </div>
  )
}

function DesdeLaFecha({
  revisiones,
  zona,
}: {
  revisiones: ReturnType<typeof useRevisiones>
  zona: string
}) {
  return revisiones.desde === null ? null : (
    <DesdeUnaFecha
      dia={revisiones.desde}
      zona={zona}
      ocupado={revisiones.ocupado}
      volver="Volver a las más recientes"
      alVolver={revisiones.volverALasMasRecientes}
    />
  )
}
