'use client'

import type { BorradorDeTipo } from '../../../entities/documentos/formulario-de-tipo'
import {
  ETIQUETA_DE_FORMATO,
  FORMATOS_DE_DOCUMENTO,
} from '../../../entities/documentos/tipo-de-documento'
import { Casilla } from './casilla'

type Props = {
  valores: BorradorDeTipo
  error: string | undefined
  alAlternar: (formato: string, marcado: boolean) => void
}

// Los formatos que acepta un tipo, como casillas con su etiqueta humana (se guardan los tipos MIME). Al menos uno: la base lo exige.
export function CamposDeFormatos({ valores, error, alAlternar }: Props) {
  return (
    <fieldset className="grid gap-1.5" aria-describedby={error ? 'formatos-error' : undefined}>
      <legend className="mb-1.5 text-sm font-medium">Formatos que se aceptan</legend>
      <div className="flex flex-wrap gap-x-4">
        {FORMATOS_DE_DOCUMENTO.map((formato) => (
          <Casilla
            key={formato}
            id={`formato-${formato.replace('/', '-')}`}
            etiqueta={ETIQUETA_DE_FORMATO[formato]}
            marcada={valores.formatos.includes(formato)}
            alCambiar={(marcada) => {
              alAlternar(formato, marcada)
            }}
          />
        ))}
      </div>
      {error ? (
        <p
          id="formatos-error"
          aria-invalid="true"
          className="text-(length:--text-sm) text-(--color-peligro-ink)"
        >
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}
