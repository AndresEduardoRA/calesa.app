'use client'

import { useState } from 'react'
import {
  NOMBRE_DE_PLATAFORMA,
  PLATAFORMAS_APIBARA,
  type PlataformaApibara,
} from '@/shared/lib/apibara'
import { enfocarPrimerError, errorDeCampo, valoresDe } from '@/shared/lib/formularios'
import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import type { ConfigApibara as Config } from '../../../entities/integraciones'
import type { EdicionesDeApibara } from '../hooks/use-apibara'

type Props = { config: Config; puedeEditar: boolean; ediciones: EdicionesDeApibara }

type PropsDePlataformas = {
  elegidas: readonly PlataformaApibara[]
  alCambiar: (elegidas: PlataformaApibara[]) => void
  error: string | undefined
}

function Plataformas({ elegidas, alCambiar, error }: PropsDePlataformas) {
  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1.5 text-(length:--text-sm) font-medium text-(--color-ink)">
        Plataformas
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

// Lo no secreto de apibara: a dónde se le pregunta y de qué plataformas.
export function ConfigApibara({ config, puedeEditar, ediciones }: Props) {
  const [plataformas, setPlataformas] = useState<readonly PlataformaApibara[]>(config.plataformas)
  const errores = ediciones.errores.config

  async function guardar(elemento: HTMLFormElement) {
    const { endpoint } = valoresDe(elemento, ['endpoint'])
    const guardada = await ediciones.guardarConfig({
      endpoint: endpoint.trim(),
      plataformas: PLATAFORMAS_APIBARA.filter((plataforma) => plataformas.includes(plataforma)),
    })
    if (!guardada) {
      enfocarPrimerError(elemento)
    }
  }

  return (
    <form
      noValidate
      onSubmit={(evento) => {
        evento.preventDefault()
        void guardar(evento.currentTarget)
      }}
    >
      <fieldset disabled={!puedeEditar} className="grid min-w-0 gap-4">
        <legend className="sr-only">Configuración de apibara</legend>
        <Campo
          nombre="endpoint"
          etiqueta="Dirección del servicio"
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          defaultValue={config.endpoint}
          error={errorDeCampo(errores, 'endpoint')}
          ayuda="A esta dirección se le manda la clave: sólo puede ser de apibara.tech."
        />
        <Plataformas
          elegidas={plataformas}
          alCambiar={setPlataformas}
          error={errorDeCampo(errores, 'plataformas')}
        />
        {puedeEditar ? (
          <div>
            <Button
              type="submit"
              variant="outline"
              className="h-11 md:h-9"
              disabled={ediciones.enCurso}
            >
              {ediciones.enCurso ? 'Guardando…' : 'Guardar configuración'}
            </Button>
          </div>
        ) : null}
      </fieldset>
    </form>
  )
}
