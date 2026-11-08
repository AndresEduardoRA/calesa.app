'use client'

import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react'
import { formatearNumero } from '@/shared/lib/formato'
import { Button } from '@/shared/ui/button'
import { MasAcciones, type AccionDeMenu } from '@/shared/ui/lista'
import type { ColumnaDeTabla } from '../../../entities/tabla-de-ayuda'
import type { FilaEditable } from '../../../entities/tablas/edicion'
import type { Crudos } from '../../../entities/tablas/vista-del-editor'
import { CeldaDelEditor } from './celda-del-editor'

type Props = {
  fila: FilaEditable
  // Su índice en la tabla entera y cuántas hay.
  indice: number
  total: number
  columnas: readonly ColumnaDeTabla[]
  crudos: Crudos[string] | undefined
  conEtiquetas: boolean
  locale: string
  // Con la tabla llena (2.000), «Sumar una fila debajo» se apaga.
  llena: boolean
  alEditar: (columna: ColumnaDeTabla, texto: string) => void
  alMover: (destino: number) => void
  alSumarDebajo: () => void
  alQuitar: () => void
}

const BOTON = 'size-11 md:size-8'

// El «⋯» de una fila: sumar debajo, mover a un extremo y quitar (quitar no pregunta: ofrece «Deshacer»).
function accionesDeLaFila(props: Props): AccionDeMenu[] {
  const { indice, total, llena } = props
  return [
    {
      tipo: 'accion',
      clave: 'sumar',
      etiqueta: 'Sumar una fila debajo',
      deshabilitada: llena,
      alElegir: props.alSumarDebajo,
      despuesDeCerrar: true,
    },
    {
      tipo: 'accion',
      clave: 'principio',
      etiqueta: 'Mover al principio',
      deshabilitada: indice === 0,
      alElegir: () => {
        props.alMover(0)
      },
    },
    {
      tipo: 'accion',
      clave: 'final',
      etiqueta: 'Mover al final',
      deshabilitada: indice === total - 1,
      alElegir: () => {
        props.alMover(total - 1)
      },
    },
    { tipo: 'separador', clave: 'sep' },
    {
      tipo: 'accion',
      clave: 'quitar',
      etiqueta: 'Quitar la fila',
      destructiva: true,
      alElegir: props.alQuitar,
    },
  ]
}

// Una fila del editor de tablas (4.23-3, C5 y C6): un campo por columna declarada, en su orden; «Subir», «Bajar» y el «⋯» con sumar, mover a un extremo y quitar.
export function FilaDelEditor(props: Props) {
  const { fila, indice, total, columnas, crudos, conEtiquetas, locale } = props
  const lugar = formatearNumero(indice + 1, { locale, decimales: 0 })
  const acciones = accionesDeLaFila(props)
  return (
    <li className="grid min-w-0 gap-2 rounded-(--radius-lg) border border-(--color-line) bg-(--color-surface) p-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
      <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-2">
        {columnas.map((columna) => (
          <CeldaDelEditor
            key={columna.clave}
            columna={columna}
            filaId={fila.id}
            valor={fila.valores[columna.clave]}
            crudo={crudos?.[columna.clave]}
            lugar={lugar}
            conEtiqueta={conEtiquetas}
            locale={locale}
            alAplicar={(texto) => {
              props.alEditar(columna, texto)
            }}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1 md:self-end">
        <span className="px-1 text-(length:--text-xs) text-(--color-ink-faint) tabular-nums">
          Fila {lugar}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={BOTON}
          aria-label={`Subir la fila ${lugar}`}
          disabled={indice === 0}
          onClick={() => {
            props.alMover(indice - 1)
          }}
        >
          <ArrowUpIcon aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={BOTON}
          aria-label={`Bajar la fila ${lugar}`}
          disabled={indice === total - 1}
          onClick={() => {
            props.alMover(indice + 1)
          }}
        >
          <ArrowDownIcon aria-hidden />
        </Button>
        <MasAcciones nombre={`la fila ${lugar}`} acciones={acciones} />
      </div>
    </li>
  )
}
