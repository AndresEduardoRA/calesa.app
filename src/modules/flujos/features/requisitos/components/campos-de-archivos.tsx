'use client'

import { Campo } from '@/shared/ui/campo'
import { etiquetaDeFormato } from '../../../entities/requisitos/descripcion'
import type { ErroresDeArchivos } from '../../../entities/requisitos/formulario-de-documento'
import { CasillaDeFormato } from './casilla-de-formato'

type Valores = { minimo: string; maximo: string; formatos: string[] }

type Props = {
  valores: Valores
  errores: ErroresDeArchivos
  // Los formatos del tipo elegido; nulo mientras no hay tipo o no se pudo leer (las casillas no se ofrecen).
  formatosDelTipo: readonly string[] | null
  // Por qué no hay casillas, cuando no las hay.
  motivoSinFormatos: string
  alEscribir: (cambios: Partial<Valores>, campo: keyof ErroresDeArchivos) => void
}

// El mínimo, el máximo y los formatos de un requisito de documento (los comparten agregar y editar). Sin formato marcado vale «los del tipo».
export function CamposDeArchivos({
  valores,
  errores,
  formatosDelTipo,
  motivoSinFormatos,
  alEscribir,
}: Props) {
  function marcar(formato: string, marcada: boolean) {
    const formatos = marcada
      ? [...valores.formatos, formato]
      : valores.formatos.filter((f) => f !== formato)
    alEscribir({ formatos }, 'formatos')
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo
          nombre="min_archivos"
          etiqueta="Mínimo de archivos"
          inputMode="numeric"
          autoComplete="off"
          value={valores.minimo}
          onChange={(evento) => {
            alEscribir({ minimo: evento.target.value }, 'min_archivos')
          }}
          error={errores.min_archivos}
        />
        <Campo
          nombre="max_archivos"
          etiqueta="Máximo de archivos"
          inputMode="numeric"
          autoComplete="off"
          value={valores.maximo}
          onChange={(evento) => {
            alEscribir({ maximo: evento.target.value }, 'max_archivos')
          }}
          error={errores.max_archivos}
        />
      </div>
      <fieldset className="grid gap-1" aria-describedby="formatos-ayuda">
        <legend className="mb-1 text-(length:--text-sm) font-medium">Formatos aceptados</legend>
        {formatosDelTipo === null || formatosDelTipo.length === 0 ? (
          <p id="formatos-ayuda" className="text-(length:--text-sm) text-(--color-ink-faint)">
            {motivoSinFormatos}
          </p>
        ) : (
          <>
            {formatosDelTipo.map((formato, lugar) => (
              <CasillaDeFormato
                key={formato}
                id={`formato-${String(lugar)}`}
                etiqueta={etiquetaDeFormato(formato)}
                marcada={valores.formatos.includes(formato)}
                invalida={errores.formatos !== undefined && lugar === 0}
                alCambiar={(marcada) => {
                  marcar(formato, marcada)
                }}
              />
            ))}
            <p id="formatos-ayuda" className="text-(length:--text-sm) text-(--color-ink-faint)">
              Sin marcar ninguno, vale lo que acepta el tipo.
            </p>
          </>
        )}
        {errores.formatos ? (
          <p className="text-(length:--text-sm) text-(--color-peligro-ink)">{errores.formatos}</p>
        ) : null}
      </fieldset>
    </>
  )
}
