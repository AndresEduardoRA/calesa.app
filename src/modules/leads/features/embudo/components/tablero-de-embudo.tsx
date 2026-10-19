'use client'

import { CORTE_DEL_TABLERO } from '@/shared/lib/ancho'
import { useAlMenos } from '@/shared/ui/ancho-de-pantalla'
import { etapaElegida } from '../../../entities/tablero'
import { usePanelDeMovida } from '../../oportunidades/hooks/use-panel-de-movida'
import type { EstadoDelTablero } from '../hooks/use-tablero'
import { ColumnaDeEtapa } from './columna-de-etapa'
import { MovidaDelTablero } from './movida-del-tablero'
import { PestanasDeEtapas } from './pestanas-de-etapas'

type Props = {
  estado: EstadoDelTablero
  etapaDeLaUrl: string | null
  alElegirEtapa: (id: string) => void
  // Lleva el foco a «Buscar en el embudo»: el camino a lo que pasa del tope de una columna.
  alIrABuscar?: () => void
}

// Las columnas del embudo. En escritorio, una al lado de la otra, con desplazamiento lateral dentro
// del tablero (la página no se corre de costado). En el celular, una por vez: las etapas son pestañas.
// Se dibuja una sola de las dos (cierre 1): la elige el servidor con el ancho de la petición, así el HTML no las lleva
// ambas y la hidratación no cambia nada; girar o redimensionar la cambia en el cliente. Con 500 tarjetas en una columna,
// la copia escondida duplicaba los nodos (26.000 en el celular) y el HTML.
export function TableroDeEmbudo({ estado, etapaDeLaUrl, alElegirEtapa, alIrABuscar }: Props) {
  const { tablero, moviendo, cargando, moverA, verMas, anuncio } = estado
  const esEscritorio = useAlMenos(CORTE_DEL_TABLERO)
  const etapas = tablero.columnas.map((c) => c.etapa)
  const elegida = etapaElegida(tablero, etapaDeLaUrl)
  const movida = usePanelDeMovida()

  const columna = (id: string, conEncabezado: boolean) => {
    const c = tablero.columnas.find((x) => x.etapa.id === id)
    return c ? (
      <ColumnaDeEtapa
        columna={c}
        etapas={etapas}
        moviendo={moviendo}
        cargando={cargando === id}
        conEncabezado={conEncabezado}
        alMover={moverA}
        alPedirMotivo={movida.pedir}
        alVerMas={() => void verMas(id)}
        buscando={tablero.busqueda !== null}
        {...(alIrABuscar ? { alIrABuscar } : {})}
      />
    ) : null
  }

  return (
    <>
      <p aria-live="polite" className="sr-only">
        {anuncio}
      </p>
      <MovidaDelTablero panel={movida} estado={estado} />
      {esEscritorio ? (
        <div className="-mx-1 overflow-x-auto px-1 pb-2">
          <div className="flex items-start gap-3">
            {tablero.columnas.map((c) => (
              <div key={c.etapa.id} className="w-72 shrink-0">
                {columna(c.etapa.id, true)}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {!esEscritorio ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
          <PestanasDeEtapas
            columnas={tablero.columnas}
            elegida={elegida}
            alElegir={alElegirEtapa}
          />
          <div
            role="tabpanel"
            aria-label={tablero.columnas.find((c) => c.etapa.id === elegida)?.etapa.nombre}
          >
            {elegida ? columna(elegida, false) : null}
          </div>
        </div>
      ) : null}
    </>
  )
}
