'use client'

import { useState } from 'react'
import { formatearNumero } from '@/shared/lib/formato'
import { Aviso } from '@/shared/ui/aviso'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { useRegional } from '@/shared/ui/regional'
import { FILAS_DE_VISTA_PREVIA } from '../../../entities/archivo-de-importacion'
import type { FilaNormalizada } from '../../../entities/plantillas'
import { PaginadorDePrevia } from './paginador-de-previa'

const FILAS_POR_PAGINA = 50

type Props = {
  previa: readonly FilaNormalizada[]
  // Las celdas de la persona, para reconocer cada fila.
  filas: readonly (readonly string[])[]
  // Nulo si se puede importar; si no, por qué no (`motivoParaNoImportar`: la acción lo vuelve a mirar).
  motivoParaNo: string | null
  alVolver: () => void
  alImportar: () => void
}

type FilaVisible = { indice: number; fila: FilaNormalizada }

// Las dos primeras celdas con algo, para reconocer la fila sin repetir todo el archivo.
function resumenDe(celdas: readonly string[] | undefined): string {
  const texto = (celdas ?? [])
    .filter((celda) => celda.trim() !== '')
    .slice(0, 2)
    .join(' · ')
  return texto.length > 60 ? `${texto.slice(0, 60)}…` : texto
}

function FilaDePrevia({ indice, fila, celdas }: FilaVisible & { celdas?: readonly string[] }) {
  const rechazo = 'rechazo' in fila ? fila.rechazo : null
  const resumen = resumenDe(celdas)
  return (
    <li className="grid gap-1 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3 text-(length:--text-sm) @2xl:col-span-3 @2xl:grid-cols-subgrid @2xl:items-start @2xl:gap-x-3">
      <span className="flex items-center gap-2">
        {/* La fila 1 del archivo son los encabezados. */}
        <span className="text-(--color-ink-faint) tabular-nums">Fila {indice + 2}</span>
        <Badge variant={rechazo ? 'destructive' : 'secondary'}>
          {rechazo ? 'Con errores' : 'Lista'}
        </Badge>
      </span>
      <span className="min-w-0 font-medium break-words">
        {resumen === '' ? '(vacía)' : resumen}
      </span>
      {rechazo ? (
        <span className="text-(--color-peligro-ink)">
          {rechazo.campo ? <strong className="font-medium">{rechazo.campo}: </strong> : null}
          {rechazo.motivo}
        </span>
      ) : (
        <span className="text-(--color-ink-faint)">Lista para importar</span>
      )}
    </li>
  )
}

// El tercer paso: las primeras 500 filas con su estado (D48). Lo que no pasa queda afuera con su motivo; las válidas entran igual. Con más
// errores que filas listas, arranca mostrando sólo los errores.
export function PasoVistaPrevia({ previa, filas, motivoParaNo, alVolver, alImportar }: Props) {
  const { locale } = useRegional()
  const numero = (n: number) => formatearNumero(n, { locale })
  const todas = previa.map((fila, indice) => ({ indice, fila }))
  const conErrores = todas.filter(({ fila }) => 'rechazo' in fila)
  const listas = previa.length - conErrores.length
  const [soloErrores, setSoloErrores] = useState(conErrores.length > listas)
  const [pagina, setPagina] = useState(0)

  const visibles = soloErrores ? conErrores : todas
  const paginas = Math.max(1, Math.ceil(visibles.length / FILAS_POR_PAGINA))
  const actual = Math.min(pagina, paginas - 1)
  const enPantalla = visibles.slice(actual * FILAS_POR_PAGINA, (actual + 1) * FILAS_POR_PAGINA)
  const total = filas.length

  return (
    <div className="@container grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-(length:--text-sm)">
          De las primeras {numero(previa.length)} filas: {numero(listas)} listas y{' '}
          {numero(conErrores.length)} con errores.
        </p>
        {conErrores.length > 0 ? (
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
            Ver sólo las filas con errores
          </Button>
        ) : null}
      </div>
      <p className="text-(length:--text-sm) text-(--color-ink-faint)">
        {total > FILAS_DE_VISTA_PREVIA
          ? `Se muestran las primeras ${numero(FILAS_DE_VISTA_PREVIA)} de ${numero(total)} filas. `
          : ''}
        Se importan las filas listas; las demás quedan afuera con su motivo. Si un teléfono ya
        existe en el sistema, se dice al terminar.
      </p>
      <ul
        className="grid gap-2 @2xl:grid-cols-[max-content_fit-content(20rem)_minmax(0,1fr)]"
        aria-label="Filas del archivo"
      >
        {enPantalla.map(({ indice, fila }) => (
          <FilaDePrevia key={indice} indice={indice} fila={fila} celdas={filas[indice]} />
        ))}
        {enPantalla.length === 0 ? (
          <li className="text-(length:--text-sm) text-(--color-ink-faint) @2xl:col-span-3">
            No hay filas para mostrar.
          </li>
        ) : null}
      </ul>
      {paginas > 1 ? (
        <PaginadorDePrevia actual={actual} paginas={paginas} alCambiar={setPagina} />
      ) : null}
      {motivoParaNo ? <Aviso tono="aviso">{motivoParaNo}</Aviso> : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" className="h-11 md:h-9" onClick={alVolver}>
          Volver a las columnas
        </Button>
        <Button
          type="button"
          className="h-11 md:h-9"
          disabled={motivoParaNo !== null}
          onClick={alImportar}
        >
          Importar {numero(total)} {total === 1 ? 'fila' : 'filas'}
        </Button>
      </div>
    </div>
  )
}
