import { useId } from 'react'
import { Switch } from '@/shared/ui/switch'
import type { ReglaDelCatalogo } from '../../../entities/reglas/catalogo'
import type { ImpactoDeRegla } from '../../../entities/reglas/impacto'
import { AvisoDeUso } from './aviso-de-uso'

type Props = {
  regla: ReglaDelCatalogo
  encendida: boolean
  // Mientras hay un envío en vuelo o sin permiso.
  deshabilitada: boolean
  impacto: ImpactoDeRegla | undefined
  claveDelFlujo: string
  alCambiar: (activa: boolean) => void
}

// Una regla: su interruptor (el nombre accesible es el de la regla), qué permite y qué enciende. El interruptor sigue a lo que lee el servidor: un apagado que
// no se hace (la regla está en uso) no «salta» y vuelve.
export function FilaDeRegla({
  regla,
  encendida,
  deshabilitada,
  impacto,
  claveDelFlujo,
  alCambiar,
}: Props) {
  const id = useId()
  return (
    <li className="rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4">
      <div className="flex items-start gap-3">
        <Switch
          aria-labelledby={`${id}-nombre`}
          aria-describedby={`${id}-texto`}
          checked={encendida}
          disabled={deshabilitada}
          onCheckedChange={alCambiar}
          className="mt-0.5"
        />
        <div className="grid min-w-0 gap-0.5" id={`${id}-texto`}>
          <p id={`${id}-nombre`} className="font-medium text-(--color-ink)">
            {regla.nombre}
          </p>
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">{regla.explicacion}</p>
          <p className="text-(length:--text-sm) text-(--color-ink-faint)">{regla.enciende}</p>
        </div>
      </div>
      {impacto ? (
        <AvisoDeUso
          nombreDeLaRegla={regla.nombre}
          impacto={impacto}
          claveDelFlujo={claveDelFlujo}
        />
      ) : null}
    </li>
  )
}
