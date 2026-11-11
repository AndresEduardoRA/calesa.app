'use client'

import { enfocarPrimerError, errorDeCampo, valoresDe } from '@/shared/lib/formularios'
import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import type { EdicionesDeWebPublica } from '../hooks/use-web-publica'

type Props = {
  revalidarUrl: string | null
  puedeEditar: boolean
  ediciones: EdicionesDeWebPublica
}

// A dónde avisa la base qué parte de la web cambió. Vacía, se borra.
export function ConfigWebPublica({ revalidarUrl, puedeEditar, ediciones }: Props) {
  async function guardar(elemento: HTMLFormElement) {
    const guardada = await ediciones.guardarDireccion(
      valoresDe(elemento, ['revalidarUrl']).revalidarUrl,
    )
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
        <legend className="sr-only">Dirección de revalidación de la web pública</legend>
        <Campo
          nombre="revalidarUrl"
          etiqueta="Dirección de revalidación"
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          defaultValue={revalidarUrl ?? ''}
          error={errorDeCampo(ediciones.errores.config, 'revalidarUrl')}
          ayuda="A esta dirección se le avisa qué cambió en la web. Empieza con https://."
        />
        {puedeEditar ? (
          <div>
            <Button
              type="submit"
              variant="outline"
              className="h-11 md:h-9"
              disabled={ediciones.enCurso}
            >
              {ediciones.enCurso ? 'Guardando…' : 'Guardar dirección'}
            </Button>
          </div>
        ) : null}
      </fieldset>
    </form>
  )
}
