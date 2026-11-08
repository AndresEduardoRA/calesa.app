'use client'

import { useState } from 'react'
import { Input } from '@/shared/ui/input'
import type { ColumnaDeTabla } from '../../../entities/tabla-de-ayuda'
import { textoParaEditar } from '../../../entities/tablas/celda-tipeada'
import type { ValorDeCelda } from '../../../entities/tablas/edicion'
import { motivoDeCelda } from '../../../entities/tablas/validacion'
import type { CrudoDeCelda } from '../../../entities/tablas/vista-del-editor'
import { idDeCelda } from '../hooks/use-filas-de-tabla'

type Props = {
  columna: ColumnaDeTabla
  filaId: string
  valor: ValorDeCelda | undefined
  // Lo tipeado que no se leyó, con su motivo.
  crudo: CrudoDeCelda | undefined
  // El lugar de la fila en la tabla entera (desde 1), ya escrito con el locale.
  lugar: string
  // La etiqueta visible va sólo en la primera fila de cada página; el nombre accesible, en todas.
  conEtiqueta: boolean
  locale: string
  alAplicar: (texto: string) => void
}

const etiquetaDe = (columna: ColumnaDeTabla) => columna.etiqueta.trim() || columna.clave

// El del crudo o, si no, el de la base, con su punto.
function motivoDe(columna: ColumnaDeTabla, valor: ValorDeCelda | undefined, crudo?: CrudoDeCelda) {
  if (crudo) return crudo.mensaje
  const motivo = motivoDeCelda(columna, valor)
  return motivo ? `${motivo}.` : null
}

const CIFRA = 'text-right tabular-nums'

const MODO_DE_TECLADO: Record<string, 'decimal' | 'numeric' | undefined> = {
  numero: 'decimal',
  anio: 'numeric',
}

// Una celda del editor de tablas (4.23-3, C5): el campo guarda lo que se tipea y lo aplica al salir (blur o Enter). Debajo, el motivo del crudo o el de la celda que no
// vale para la base (un booleano de SQL, un texto de más de 200).
export function CeldaDelEditor(props: Props) {
  const { columna, filaId, valor, crudo, lugar, conEtiqueta, locale, alAplicar } = props
  const [tipeado, setTipeado] = useState<string | null>(null)
  const id = idDeCelda(filaId, columna.clave)
  const idMotivo = `${id}-motivo`
  const etiqueta = etiquetaDe(columna)
  const motivo = motivoDe(columna, valor, crudo)
  const modo = MODO_DE_TECLADO[columna.tipo]
  const aplicar = () => {
    if (tipeado === null) return
    alAplicar(tipeado)
    setTipeado(null)
  }
  return (
    <div className="grid min-w-0 content-start gap-1">
      {conEtiqueta ? (
        <span aria-hidden className="text-(length:--text-xs) text-(--color-ink-soft)">
          {etiqueta}
        </span>
      ) : null}
      <Input
        id={id}
        name={id}
        aria-label={`${etiqueta}, fila ${lugar}`}
        inputMode={modo}
        autoComplete="off"
        className={`min-h-11 md:min-h-8 ${modo ? CIFRA : ''}`}
        value={tipeado ?? crudo?.texto ?? textoParaEditar(columna, valor, locale)}
        aria-invalid={motivo ? true : undefined}
        aria-describedby={motivo ? idMotivo : undefined}
        onChange={(evento) => {
          setTipeado(evento.target.value)
        }}
        onBlur={aplicar}
        onKeyDown={(evento) => {
          if (evento.key === 'Enter') {
            evento.preventDefault()
            aplicar()
          }
        }}
      />
      {motivo ? (
        <p id={idMotivo} className="text-(length:--text-xs) text-(--color-peligro-ink)">
          {motivo}
        </p>
      ) : null}
    </div>
  )
}
