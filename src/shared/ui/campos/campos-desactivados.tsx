import type { CampoBase } from '@/shared/lib/campos'
import { Bloque } from '@/shared/ui/bloque'
import { Button } from '@/shared/ui/button'

type DelCampo = Pick<CampoBase, 'id' | 'etiqueta'>

type Props<Campo extends DelCampo> = {
  campos: readonly Campo[]
  deshabilitado: boolean
  alReactivar: (campo: Campo) => void
}

// Los campos que se sacaron del formulario. Sus datos siguen guardados: reactivarlos los devuelve.
export function CamposDesactivados<Campo extends DelCampo>({
  campos,
  deshabilitado,
  alReactivar,
}: Props<Campo>) {
  return (
    <Bloque titulo={`Campos desactivados (${campos.length})`} plegado>
      <ul className="grid gap-2">
        {campos.map((campo) => (
          <li key={campo.id} className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-(length:--text-sm) text-(--color-ink)">{campo.etiqueta}</span>
            <Button
              variant="outline"
              className="h-11 md:h-8"
              disabled={deshabilitado}
              aria-label={`Reactivar ${campo.etiqueta}`}
              onClick={() => {
                alReactivar(campo)
              }}
            >
              Reactivar
            </Button>
          </li>
        ))}
      </ul>
    </Bloque>
  )
}
