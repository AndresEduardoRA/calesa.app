'use client'

import type { ResumenDeImpacto } from '@/shared/lib/campos'
import { Button } from '@/shared/ui/button'
import { AvisoDeImpacto } from '@/shared/ui/campos/aviso-de-impacto'

type Props = {
  // El requisito que se volvería bloqueante, dicho en una línea.
  descripcion: string
  resumen: ResumenDeImpacto
  enCurso: boolean
  alConfirmar: () => void
  alCancelar: () => void
}

// El aviso de impacto en línea, bajo la lista (no un diálogo: no destruye nada y se revierte con el mismo interruptor). Nombra el requisito, dice cuántas
// unidades quedan fuera de regla y pide confirmar. «Volver bloqueante» tiene el foco al abrirse.
export function ConfirmarBloqueo({
  descripcion,
  resumen,
  enCurso,
  alConfirmar,
  alCancelar,
}: Props) {
  return (
    <div role="group" aria-label="Volver bloqueante el requisito" className="grid gap-2">
      <p className="text-(length:--text-sm) font-medium break-words text-(--color-ink)">
        {descripcion}
      </p>
      <AvisoDeImpacto resumen={resumen} />
      <div className="flex flex-wrap gap-2">
        <Button autoFocus onClick={alConfirmar} disabled={enCurso}>
          Volver bloqueante
        </Button>
        <Button variant="outline" onClick={alCancelar} disabled={enCurso}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
