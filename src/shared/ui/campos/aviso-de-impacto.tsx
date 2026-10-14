import type { ResumenDeImpacto } from '@/shared/lib/campos'
import { Aviso } from '@/shared/ui/aviso'

type Props = { resumen: ResumenDeImpacto }

// Lo que le pasa a lo ya cargado si se hace el cambio, dicho antes de hacerlo. Va dentro del
// panel y no en un diálogo: un modal no abre otro modal.
export function AvisoDeImpacto({ resumen }: Props) {
  return (
    <Aviso tono={resumen.bloquea ? 'peligro' : 'aviso'}>
      <ul className="grid gap-1.5">
        {resumen.avisos.map((aviso) => (
          <li key={aviso}>{aviso}</li>
        ))}
      </ul>
      {resumen.bloquea ? null : <p className="mt-2 font-medium">Revisa y confirma para guardar.</p>}
    </Aviso>
  )
}
