'use client'

import { useState } from 'react'
import { formatearNumero } from '@/shared/lib/formato'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { useRegional } from '@/shared/ui/regional'
import type { ObjetivoDeImportacion } from '../../../entities/importacion/emparejar'
import type { FilaPreparada } from '../../../entities/importacion/filas'
import { FILAS_POR_PAGINA_DE_PREVIA } from '../../../entities/importacion/limites'
import { OBJETIVO_PAIS } from '../../../entities/importacion/pais'

type Props = {
  preparadas: readonly FilaPreparada[]
  objetivos: readonly ObjetivoDeImportacion[]
  alVolver: () => void
  alImportar: () => void
}

function Motivos({
  fila,
  etiquetas,
}: {
  fila: FilaPreparada
  etiquetas: ReadonlyMap<string, string>
}) {
  if (fila.motivos.length === 0) {
    // «País» completado con el del teléfono: se dice, para que no sorprenda al importar.
    const pais = fila.paisDelTelefono
    return (
      <span className="text-(--color-ink-faint)">
        Lista para importar
        {pais === null
          ? ''
          : ` · ${etiquetas.get(OBJETIVO_PAIS) ?? 'País'}: ${pais} (del teléfono)`}
      </span>
    )
  }
  return (
    <ul className="grid gap-0.5 text-(--color-peligro-ink)">
      {fila.motivos.map((m) => (
        <li key={`${m.campo ?? ''}-${m.motivo}`}>
          {m.campo !== null && etiquetas.has(m.campo) ? (
            <strong className="font-medium">{etiquetas.get(m.campo)}: </strong>
          ) : null}
          {m.motivo}
        </li>
      ))}
    </ul>
  )
}

function FilaDePrevia({
  fila,
  etiquetas,
}: {
  fila: FilaPreparada
  etiquetas: ReadonlyMap<string, string>
}) {
  return (
    <li className="grid gap-1 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3 text-(length:--text-sm) @2xl:col-span-3 @2xl:grid-cols-subgrid @2xl:items-start @2xl:gap-x-3">
      <span className="flex items-center gap-2">
        <span className="text-(--color-ink-faint) tabular-nums">Fila {fila.fila}</span>
        <Badge variant={fila.pedido === null ? 'destructive' : 'secondary'}>
          {fila.pedido === null ? 'Con errores' : 'Lista'}
        </Badge>
      </span>
      <span className="min-w-0 font-medium break-words">
        {fila.nombre === '' ? '(sin nombre)' : fila.nombre}
      </span>
      <Motivos fila={fila} etiquetas={etiquetas} />
    </li>
  )
}

function Paginador({
  actual,
  paginas,
  alCambiar,
}: {
  actual: number
  paginas: number
  alCambiar: (pagina: number) => void
}) {
  return (
    <nav
      aria-label="Páginas de la vista previa"
      className="flex items-center justify-between gap-2"
    >
      <Button
        type="button"
        variant="outline"
        className="h-11 md:h-9"
        disabled={actual === 0}
        onClick={() => {
          alCambiar(actual - 1)
        }}
      >
        Anterior
      </Button>
      <span className="text-(length:--text-sm) tabular-nums">
        Página {actual + 1} de {paginas}
      </span>
      <Button
        type="button"
        variant="outline"
        className="h-11 md:h-9"
        disabled={actual >= paginas - 1}
        onClick={() => {
          alCambiar(actual + 1)
        }}
      >
        Siguiente
      </Button>
    </nav>
  )
}

// El tercer paso: cada fila con su estado. Lo que no pasa se explica con su motivo y la fila del
// archivo; las válidas entran igual. Con más errores que filas listas, arranca mostrando sólo los
// errores.
export function PasoVistaPrevia({ preparadas, objetivos, alVolver, alImportar }: Props) {
  const { locale } = useRegional()
  const conErrores = preparadas.filter((fila) => fila.pedido === null).length
  const listas = preparadas.length - conErrores
  const [soloErrores, setSoloErrores] = useState(conErrores > listas)
  const [pagina, setPagina] = useState(0)
  const etiquetas = new Map(objetivos.map((objetivo) => [objetivo.id, objetivo.etiqueta]))

  const visibles = soloErrores ? preparadas.filter((fila) => fila.pedido === null) : preparadas
  const paginas = Math.max(1, Math.ceil(visibles.length / FILAS_POR_PAGINA_DE_PREVIA))
  const actual = Math.min(pagina, paginas - 1)
  const desde = actual * FILAS_POR_PAGINA_DE_PREVIA
  const enPantalla = visibles.slice(desde, desde + FILAS_POR_PAGINA_DE_PREVIA)
  const numero = (n: number) => formatearNumero(n, { locale })

  return (
    <div className="@container grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-(length:--text-sm)">
          <strong className="font-medium">{numero(preparadas.length)} filas</strong>:{' '}
          {numero(listas)} listas y {numero(conErrores)} con errores.
        </p>
        {conErrores > 0 ? (
          <Button
            type="button"
            variant={soloErrores ? 'default' : 'outline'}
            aria-pressed={soloErrores}
            className="h-11 md:h-9"
            onClick={() => {
              setSoloErrores((valor) => !valor)
              setPagina(0)
            }}
          >
            Solo con errores
          </Button>
        ) : null}
      </div>
      <p className="text-(length:--text-sm) text-(--color-ink-faint)">
        Se importan las filas listas; las demás quedan afuera y podrás descargarlas con su motivo
        para corregirlas. Si un teléfono ya existe en el sistema, se dice al importar.
      </p>
      {/* Con sitio (un contenedor de 42 rem o más, no el viewport: al 200 % de texto el escritorio mide como un celular) la lista es la grilla: «Fila N» con su distintivo (el ancho de lo más ancho, sin partirse), el nombre (el ancho de su contenido, hasta 20 rem, y se parte si pasa) y el motivo
          (lo que sobra). Con un tercio fijo para el nombre, «…escritorio B 1» se partía con la mitad del ancho vacía (defecto 4.3). */}
      <ul
        className="grid gap-2 @2xl:grid-cols-[max-content_fit-content(20rem)_minmax(0,1fr)]"
        aria-label="Filas del archivo"
      >
        {enPantalla.map((fila) => (
          <FilaDePrevia key={fila.id} fila={fila} etiquetas={etiquetas} />
        ))}
        {enPantalla.length === 0 ? (
          <li className="text-(length:--text-sm) text-(--color-ink-faint) @2xl:col-span-3">
            No hay filas para mostrar.
          </li>
        ) : null}
      </ul>
      {paginas > 1 ? <Paginador actual={actual} paginas={paginas} alCambiar={setPagina} /> : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" className="h-11 md:h-9" onClick={alVolver}>
          Volver a las columnas
        </Button>
        <Button type="button" className="h-11 md:h-9" disabled={listas === 0} onClick={alImportar}>
          {listas === 0
            ? 'No hay filas para importar'
            : `Importar ${numero(listas)} ${listas === 1 ? 'lead' : 'leads'}`}
        </Button>
      </div>
    </div>
  )
}
