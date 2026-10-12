'use client'

import { useState } from 'react'
import { enfocarPrimerError, valoresDe } from '@/shared/lib/formularios'
import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import {
  PLATAFORMAS_APIBARA,
  type ConfigApibara as Config,
  type PlataformaApibara,
} from '../../../entities/integraciones'
import type { EdicionesDeApibara } from '../hooks/use-apibara'

// Nombres propios de las casas de subasta que apibara sabe leer.
const NOMBRE_DE_PLATAFORMA: Record<PlataformaApibara, string> = { copart: 'Copart', iaai: 'IAAI' }

type Props = { config: Config; puedeEditar: boolean; ediciones: EdicionesDeApibara }

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
          // Zod marca el error en `config`: es el único campo de texto de este formulario.
          error={errores?.config?.[0]}
        />
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
                  checked={plataformas.includes(plataforma)}
                  onChange={(evento) => {
                    setPlataformas(
                      evento.target.checked
                        ? [...plataformas, plataforma]
                        : plataformas.filter((una) => una !== plataforma),
                    )
                  }}
                />
                {NOMBRE_DE_PLATAFORMA[plataforma]}
              </label>
            ))}
          </div>
        </fieldset>
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
