import {
  destinoDeMovimiento,
  type CampoBase,
  type GrupoDeCampos,
  type Sentido,
} from '@/shared/lib/campos'
import { FilaDeCampo } from './fila-de-campo'
import type { BanderaDeCampo } from './tipos'

type Props<Campo extends CampoBase> = {
  grupos: readonly GrupoDeCampos<Campo>[]
  // Todos, también los desactivados: el orden se mide sobre el layout entero.
  campos: readonly Campo[]
  banderas: readonly BanderaDeCampo[]
  puedeGestionar: boolean
  ocupado: boolean
  alAbrir: (id: string) => void
  alMover: (campo: Campo, sentido: Sentido) => void
  alCambiarBandera: (campo: Campo, clave: string, valor: boolean) => void
}

// Los campos activos, un bloque por grupo, en el orden del layout.
export function GruposDeCampos<Campo extends CampoBase>(props: Props<Campo>) {
  const { grupos, campos, banderas, puedeGestionar, ocupado } = props
  const { alAbrir, alMover, alCambiarBandera } = props
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
                banderas={banderas}
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
                alCambiarBandera={(clave, valor) => {
                  alCambiarBandera(campo, clave, valor)
                }}
              />
            ))}
          </ul>
        </div>
      ))}
    </>
  )
}
