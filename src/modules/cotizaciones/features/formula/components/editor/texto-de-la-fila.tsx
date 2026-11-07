'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/textarea'
import type { ErrorDeFila } from '../../../../entities/formula/compilar-fila'
import type { FilaParaDibujar } from '../../hooks/use-editor-de-la-formula.soporte'
import { ErrorDeLaFila } from './error-de-la-fila'

type Props = {
  fila: FilaParaDibujar
  // El texto con que abre: el vigente de la fila, o vacío si se muestra por sus campos.
  inicial: string
  error: ErrorDeFila | null
  alCancelar: () => void
  alAplicar: (texto: string, confirmaPisar?: boolean) => void
}

// El texto de la fila abierta (C5, C6): se compila al aplicar («Aplicar» o Ctrl/Cmd+Enter), nunca al tipear; Esc cancela. Lo tipeado vive aquí hasta aplicar, así
// que tipear no vuelve a dibujar la lista. El error queda debajo del texto, que no se pierde; `pisa_un_valor` (4-5) dice qué valores del ⚙ se pisarían y espera
// «Pisar el valor».
export function TextoDeLaFila({ fila, inicial, error, alCancelar, alAplicar }: Props) {
  const [texto, setTexto] = useState(inicial)
  const campo = useRef<HTMLTextAreaElement>(null)
  const idDelError = useId()
  useEffect(() => {
    campo.current?.focus()
  }, [error])
  const pisa = error?.codigo === 'pisa_un_valor' ? error : null
  return (
    <div className="grid min-w-0 gap-2">
      <label htmlFor={`${idDelError}-texto`} className="sr-only">
        Texto de {fila.etiqueta}
      </label>
      <Textarea
        ref={campo}
        id={`${idDelError}-texto`}
        className="font-mono"
        spellCheck={false}
        value={texto}
        aria-invalid={error !== null && pisa === null ? true : undefined}
        aria-describedby={error ? idDelError : undefined}
        onChange={(evento) => {
          setTexto(evento.target.value)
        }}
        onKeyDown={(evento) => {
          if (evento.key === 'Escape') {
            evento.preventDefault()
            alCancelar()
          } else if (evento.key === 'Enter' && (evento.ctrlKey || evento.metaKey)) {
            evento.preventDefault()
            alAplicar(texto)
          }
        }}
      />
      {error ? <ErrorDeLaFila id={idDelError} error={error} formatos={fila.formatos} /> : null}
      <div className="flex flex-wrap gap-2">
        {pisa ? (
          <Button
            type="button"
            className="min-h-11 md:min-h-9"
            onClick={() => {
              alAplicar(texto, true)
            }}
          >
            Pisar el valor
          </Button>
        ) : (
          <Button
            type="button"
            className="min-h-11 md:min-h-9"
            onClick={() => {
              alAplicar(texto)
            }}
          >
            Aplicar
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          className="min-h-11 md:min-h-9"
          onClick={alCancelar}
        >
          Cancelar
        </Button>
      </div>
    </div>
  )
}
