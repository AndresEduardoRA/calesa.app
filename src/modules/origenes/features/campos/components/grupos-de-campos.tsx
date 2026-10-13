import type { CambiosDeCampo } from '../../../entities/cambios-de-campo'
import {
  destinoDeMovimiento,
  type CampoDeLayout,
  type GrupoDeCampos,
  type Sentido,
} from '../../../entities/campo'
import { FilaDeCampo } from './fila-de-campo'

type Props = {
  grupos: readonly GrupoDeCampos[]
  // Todos, también los desactivados: el orden se mide sobre el origen entero.
  campos: readonly CampoDeLayout[]
  puedeGestionar: boolean
  ocupado: boolean
  alAbrir: (id: string) => void
  alMover: (campo: CampoDeLayout, sentido: Sentido) => void
  alCambiarBandera: (campo: CampoDeLayout, cambios: CambiosDeCampo) => void
}

// Los campos activos, un bloque por grupo, en el orden del layout.
export function GruposDeCampos(props: Props) {
  const { grupos, campos, puedeGestionar, ocupado, alAbrir, alMover, alCambiarBandera } = props
  return (
    <>
      {grupos.map((grupo) => (
        <div key={grupo.nombre ?? 'sin-grupo'} className="grid gap-2">
          <h3 className="text-(length:--text-sm) font-medium text-(--color-ink-soft)">
            {grupo.nombre ?? 'Sin grupo'}
          </h3>
          <ul className="divide-y divide-(--color-line) overflow-hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)">
            {grupo.campos.map((campo) => (
              <FilaDeCampo
                key={campo.id}
                campo={campo}
                puedeGestionar={puedeGestionar}
                ocupado={ocupado}
                puedeSubir={destinoDeMovimiento(campos, campo.id, 'subir') !== null}
                puedeBajar={destinoDeMovimiento(campos, campo.id, 'bajar') !== null}
                alAbrir={() => {
                  alAbrir(campo.id)
                }}
                alMover={(sentido) => {
                  alMover(campo, sentido)
                }}
                alCambiarBandera={(cambios) => {
                  alCambiarBandera(campo, cambios)
                }}
              />
            ))}
          </ul>
        </div>
      ))}
    </>
  )
}
