import { ETIQUETA_DE_TIPO_DE_CAMPO, type CampoBase } from '@/shared/lib/campos'
import { Badge } from '@/shared/ui/badge'

type Props = {
  campo: CampoBase
  // Lo propio del módulo que dice la fila (un cambio que todavía se está aplicando).
  insignias: readonly string[]
}

// El nombre de un campo en su fila: la etiqueta, lo que dice con texto (requerido, de fábrica y lo del módulo) y su tipo y clave.
export function NombreDeCampo({ campo, insignias }: Props) {
  return (
    <div className="order-2 grid min-w-40 flex-1 gap-0.5">
      <span className="flex flex-wrap items-center gap-2">
        <span className="text-(length:--text-base) font-medium text-(--color-ink)">
          {campo.etiqueta}
        </span>
        {campo.requerido ? <Badge variant="secondary">Requerido</Badge> : null}
        {campo.esSistema ? <Badge variant="outline">De fábrica</Badge> : null}
        {insignias.map((insignia) => (
          <Badge key={insignia} variant="outline">
            {insignia}
          </Badge>
        ))}
      </span>
      <span className="text-(length:--text-sm) text-(--color-ink-faint)">
        {ETIQUETA_DE_TIPO_DE_CAMPO[campo.tipo]} · <span className="font-mono">{campo.clave}</span>
      </span>
    </div>
  )
}
