'use client'

import { CORTE_DEL_TABLERO } from '@/shared/lib/ancho'
import { conteoCorto } from '@/shared/lib/conteo'
import { useAlMenos } from '@/shared/ui/ancho-de-pantalla'
import { useRegional } from '@/shared/ui/regional'
import { etapaElegida } from '../../../entities/tablero'
import { PuntoDeColor } from '../../etiquetas/components/insignia-de-etiqueta'
import type { EstadoDelTablero } from '../hooks/use-tablero'
import { ColumnaDeEtapa } from './columna-de-etapa'

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
  const { locale } = useRegional()
  const esEscritorio = useAlMenos(CORTE_DEL_TABLERO)
  const etapas = tablero.columnas.map((c) => c.etapa)
  const elegida = etapaElegida(tablero, etapaDeLaUrl)

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
        <div className="grid gap-3">
          <div
            role="tablist"
            aria-label="Etapas"
            className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1"
          >
            {tablero.columnas.map((c) => {
              const activa = c.etapa.id === elegida
              return (
                <button
                  key={c.etapa.id}
                  type="button"
                  role="tab"
                  aria-selected={activa}
                  onClick={() => {
                    alElegirEtapa(c.etapa.id)
                  }}
                  className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-(--radius-pill) border px-3 text-(length:--text-sm) ${
                    activa
                      ? 'border-(--color-primario) bg-(--color-primario-soft) text-(--color-primario-ink)'
                      : 'border-(--color-line) text-(--color-ink-soft)'
                  }`}
                >
                  <PuntoDeColor color={c.etapa.color} className="size-2.5" />
                  {c.etapa.nombre}
                  <span className="tabular-nums">{conteoCorto(c.total, { locale })}</span>
                </button>
              )
            })}
          </div>
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
