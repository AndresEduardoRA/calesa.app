'use client'

import type { ColumnaDeTabla } from '../../../entities/tabla-de-ayuda'
import { TOPE_DE_FILAS } from '../../../entities/tablas/validacion'
import { FILAS_POR_PAGINA_DEL_EDITOR } from '../../../entities/tablas/vista-del-editor'
import type { FilasDeTabla } from '../hooks/use-filas-de-tabla'
import { FilaDelEditor } from './fila-del-editor'

type Props = {
  nombre: string
  columnas: readonly ColumnaDeTabla[]
  edicion: FilasDeTabla
  locale: string
}

// Las filas de la página que se ve (4.23-3, C5–C7): 100 de la tabla entera, con su lugar en ella.
export function FilasDelEditor({ nombre, columnas, edicion, locale }: Props) {
  const { estado, pagina } = edicion
  if (estado.filas.length === 0) {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">La tabla no tiene filas.</p>
    )
  }
  const desde = pagina * FILAS_POR_PAGINA_DEL_EDITOR
  const visibles = estado.filas.slice(desde, desde + FILAS_POR_PAGINA_DEL_EDITOR)
  const llena = estado.filas.length >= TOPE_DE_FILAS
  return (
    <ul aria-label={`Filas de ${nombre}`} className="grid grid-cols-[minmax(0,1fr)] gap-2">
      {visibles.map((fila, i) => (
        <FilaDelEditor
          key={fila.id}
          fila={fila}
          indice={desde + i}
          total={estado.filas.length}
          columnas={columnas}
          crudos={estado.crudos[fila.id]}
          conEtiquetas={i === 0}
          locale={locale}
          llena={llena}
          alEditar={(columna, texto) => {
            edicion.editar(columna, fila.id, texto)
          }}
          alMover={(destino) => {
            edicion.mover(fila.id, destino)
          }}
          alSumarDebajo={() => {
            edicion.sumar(desde + i + 1)
          }}
          alQuitar={() => {
            edicion.quitar(fila.id)
          }}
        />
      ))}
    </ul>
  )
}
