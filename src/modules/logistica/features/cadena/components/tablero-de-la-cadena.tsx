'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { useRef } from 'react'
import { CORTE_DEL_TABLERO } from '@/shared/lib/ancho'
import { useAlMenos } from '@/shared/ui/ancho-de-pantalla'
import { PistaDeDesborde } from '@/shared/ui/pista-de-desborde'
import { useDesborde } from '@/shared/ui/use-desborde'
import { claveDeColumna, columnaElegida } from '../../../entities/cadena/columna'
import { CLAVE_DE_FASE_DE_LA_CADENA } from '../../../entities/cadena/filtros'
import type { ColumnaDeLaCadena as Columna } from '../../../entities/cadena/leer'
import type { EstadoDeLaCadena } from '../hooks/use-cadena'
import { ColumnaDeLaCadena } from './columna-de-la-cadena'
import { PestanasDeFases } from './pestanas-de-fases'

type Props = {
  estado: EstadoDeLaCadena
  filtrada: boolean
  ahora: Date
  hrefDe: (id: string) => string
  alAbrir: (id: string) => void
}

// Las columnas de la cadena. En escritorio, una al lado de la otra en el orden de la base, con desplazamiento de costado dentro de su caja (la página no se corre) y la pista de que sigue.
// En el celular, una por vez: las fases son pestañas (`?fase=`). Se dibuja sólo una de las dos vistas (la elige el ancho de la petición), así el HTML no lleva las dos.
export function TableroDeLaCadena({ estado, filtrada, ahora, hrefDe, alAbrir }: Props) {
  const { columnas, cargando, anuncio, verMas } = estado
  const esEscritorio = useAlMenos(CORTE_DEL_TABLERO)
  const [faseDeLaUrl, setFase] = useQueryState(
    CLAVE_DE_FASE_DE_LA_CADENA,
    parseAsString.withOptions({ shallow: true }),
  )
  const caja = useRef<HTMLDivElement>(null)
  const desborde = useDesborde(caja)
  const elegida = columnaElegida(columnas, faseDeLaUrl)

  const columna = (c: Columna, conEncabezado: boolean) => (
    <ColumnaDeLaCadena
      columna={c}
      conEncabezado={conEncabezado}
      cargando={cargando === claveDeColumna(c.faseId)}
      filtrada={filtrada}
      ahora={ahora}
      hrefDe={hrefDe}
      alAbrir={alAbrir}
      alVerMas={() => void verMas(c)}
    />
  )

  return (
    <>
      <p aria-live="polite" className="sr-only">
        {anuncio}
      </p>
      {esEscritorio ? (
        <div className="relative min-w-0">
          <div ref={caja} className="-mx-1 overflow-x-auto px-1 pb-2">
            <div className="flex items-start gap-3">
              {columnas.map((c) => (
                <div key={claveDeColumna(c.faseId)} className="w-72 shrink-0">
                  {columna(c, true)}
                </div>
              ))}
            </div>
          </div>
          <PistaDeDesborde {...desborde} />
        </div>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
          <PestanasDeFases
            columnas={columnas}
            elegida={elegida ? claveDeColumna(elegida.faseId) : null}
            alElegir={(clave) => void setFase(clave)}
          />
          <div role="tabpanel" aria-label={elegida?.nombre ?? 'Sin fase'}>
            {elegida ? columna(elegida, false) : null}
          </div>
        </div>
      )}
    </>
  )
}
