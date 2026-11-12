'use client'

import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import type { FlujoParaConfigurar, TransicionParaConfigurar } from '../../../entities/flujo'
import type { RolLeido } from '../../../entities/lectura-de-fase'
import { quienMueve, textoDeQuienMueve } from '../../../entities/transiciones/quien-mueve'
import {
  descripcionDeSalida,
  nombreDelDestino,
} from '../../../entities/transiciones/vista-de-salidas'

type Props = {
  flujo: FlujoParaConfigurar
  salida: TransicionParaConfigurar
  roles: readonly RolLeido[]
  // Para que el foco vuelva a este botón al cerrar el diálogo de quitar.
  marca: string
  escribiendo: boolean
  alPedirQuitar: () => void
}

// Una salida de la fase: «Embarcar → Embarcado» como texto, «Pide nota» y «Jubilada» si aplican, quién puede mover por ella y «Quitar».
export function FilaDeSalida({ flujo, salida, roles, marca, escribiendo, alPedirQuitar }: Props) {
  const destino = nombreDelDestino(flujo, salida)
  const jubilada = flujo.fases.find((f) => f.id === salida.aFaseId)?.activa === false
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) py-2 pr-2 pl-3">
      <div className="min-w-48 grow basis-0">
        <p className="text-(length:--text-sm) break-words text-(--color-ink)">
          {descripcionDeSalida(salida, destino)}
        </p>
        <p className="text-(length:--text-xs) break-words text-(--color-ink-soft)">
          {textoDeQuienMueve(quienMueve(flujo, salida.deFaseId, salida.aFaseId), roles)}
        </p>
      </div>
      {salida.notaObligatoria ? <Badge variant="secondary">Pide nota</Badge> : null}
      {jubilada ? <Badge variant="secondary">Jubilada</Badge> : null}
      <Button
        type="button"
        variant="outline"
        className="h-11 md:h-8"
        data-quitar-salida={marca}
        disabled={escribiendo}
        aria-label={`Quitar la salida a ${destino}`}
        onClick={alPedirQuitar}
      >
        Quitar
      </Button>
    </li>
  )
}
