import { Badge } from '@/shared/ui/badge'
import { marcasDeLaFase } from '../../../entities/lectura-de-fase'
import type { FaseParaConfigurar } from '../../../entities/flujo'

// El nombre de la fase con su color (el de la fila: texto y color, nunca sólo color).
export function NombreConColor({ fase }: { fase: Pick<FaseParaConfigurar, 'nombre' | 'color'> }) {
  return (
    <Badge variant="outline" className="max-w-full gap-1.5">
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: fase.color }}
      />
      <span className="truncate">{fase.nombre}</span>
    </Badge>
  )
}

// «Inicial», «Final» y «Jubilada», las que tenga.
export function MarcasDeLaFase({ fase }: { fase: FaseParaConfigurar }) {
  const marcas = marcasDeLaFase(fase)
  return marcas.length === 0 ? null : (
    <>
      {marcas.map((marca) => (
        <Badge key={marca} variant="secondary">
          {marca}
        </Badge>
      ))}
    </>
  )
}
