'use client'

import { useId } from 'react'
import {
  NOMBRE_DE_PLATAFORMA,
  PLATAFORMAS_APIBARA,
  type PlataformaApibara,
} from '@/shared/lib/apibara'
import { Campo } from '@/shared/ui/campo'
import { Opciones } from '@/shared/ui/opciones'
import { contados, frasePorVacio } from '../../../entities/nombre'
import type { Genero } from '../../../entities/origen'
import type { ValoresDeOrigen } from '../hooks/use-valores-de-origen'

// Lo que se suele importar: el sustantivo es libre, esto sólo lo sugiere.
const SUGERENCIAS = ['vehículo', 'unidad', 'lote', 'auto', 'camioneta']

type Errores = Partial<Record<'nombre' | 'sustantivo' | 'color' | 'plataformas', string>>

type Props = {
  valores: ValoresDeOrigen
  alCambiar: (parcial: Partial<ValoresDeOrigen>) => void
  esDeSubasta: boolean
  errores: Errores
  deshabilitado?: boolean
}

type PropsDePlataformas = {
  elegidas: readonly PlataformaApibara[]
  alCambiar: (plataformas: PlataformaApibara[]) => void
  error: string | undefined
  deshabilitado: boolean
}

function Plataformas({ elegidas, alCambiar, error, deshabilitado }: PropsDePlataformas) {
  return (
    <fieldset className="grid gap-1.5" disabled={deshabilitado}>
      <legend className="mb-1.5 text-(length:--text-sm) font-medium text-(--color-ink)">
        Plataformas de apibara
      </legend>
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        {PLATAFORMAS_APIBARA.map((plataforma) => (
          <label
            key={plataforma}
            className="flex min-h-11 cursor-pointer items-center gap-2 text-(length:--text-sm) text-(--color-ink) md:min-h-8"
          >
            <input
              type="checkbox"
              className="size-4 accent-(--color-primario)"
              checked={elegidas.includes(plataforma)}
              onChange={(evento) => {
                alCambiar(
                  evento.target.checked
                    ? [...elegidas, plataforma]
                    : elegidas.filter((una) => una !== plataforma),
                )
              }}
            />
            {NOMBRE_DE_PLATAFORMA[plataforma]}
          </label>
        ))}
      </div>
      {error ? (
        <p role="alert" className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}

type PropsDelSustantivo = {
  valor: string
  error: string | undefined
  deshabilitado: boolean | undefined
  alCambiar: (sustantivo: string) => void
}

// El sustantivo es libre; la lista sólo sugiere lo que se suele importar.
function CampoSustantivo({ valor, error, deshabilitado, alCambiar }: PropsDelSustantivo) {
  const idSugerencias = useId()
  return (
    <div className="grid gap-1.5">
      <Campo
        nombre="sustantivo"
        etiqueta="Lo que entra por acá se llama"
        autoComplete="off"
        maxLength={30}
        list={idSugerencias}
        value={valor}
        onChange={(evento) => {
          alCambiar(evento.target.value)
        }}
        error={error}
        ayuda="Vehículo, unidad, lote…"
        disabled={deshabilitado}
      />
      <datalist id={idSugerencias}>
        {SUGERENCIAS.map((sugerencia) => (
          <option key={sugerencia} value={sugerencia} />
        ))}
      </datalist>
    </div>
  )
}

// Los datos que comparten el alta y la edición de un origen. Cómo se llama («Corea»), cómo se
// llama lo que entra por ahí y de qué género es, para que la interfaz concuerde sin texto fijo.
export function CamposDeOrigen({ valores, alCambiar, esDeSubasta, errores, deshabilitado }: Props) {
  const sustantivo = valores.sustantivo.trim() === '' ? 'vehículo' : valores.sustantivo.trim()
  return (
    <>
      <Campo
        nombre="nombre"
        etiqueta="Nombre"
        autoComplete="off"
        maxLength={60}
        value={valores.nombre}
        onChange={(evento) => {
          alCambiar({ nombre: evento.target.value })
        }}
        error={errores.nombre}
        disabled={deshabilitado}
      />
      <div className="grid items-start gap-4 sm:grid-cols-2">
        <CampoSustantivo
          valor={valores.sustantivo}
          error={errores.sustantivo}
          deshabilitado={deshabilitado}
          alCambiar={(valor) => {
            alCambiar({ sustantivo: valor })
          }}
        />
        <Opciones<Genero>
          etiqueta="Género"
          opciones={[
            { valor: 'm', etiqueta: 'Masculino' },
            { valor: 'f', etiqueta: 'Femenino' },
          ]}
          valor={valores.genero}
          alCambiar={(genero) => {
            alCambiar({ genero })
          }}
          deshabilitado={deshabilitado}
        />
      </div>
      <p className="text-(length:--text-sm) text-(--color-ink-faint)" aria-live="polite">
        Se verá así: «{frasePorVacio({ ...valores })}» · «{contados(12, sustantivo)}»
      </p>
      <Campo
        nombre="color"
        etiqueta="Color"
        type="color"
        value={valores.color}
        onChange={(evento) => {
          alCambiar({ color: evento.target.value })
        }}
        error={errores.color}
        ayuda="Distingue al origen en listas y tableros."
        disabled={deshabilitado}
        className="h-11 w-24 p-1 md:h-9"
      />
      {esDeSubasta ? (
        <Plataformas
          elegidas={valores.plataformas}
          alCambiar={(plataformas) => {
            alCambiar({ plataformas })
          }}
          error={errores.plataformas}
          deshabilitado={deshabilitado ?? false}
        />
      ) : null}
    </>
  )
}
