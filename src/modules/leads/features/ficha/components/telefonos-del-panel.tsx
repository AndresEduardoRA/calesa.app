'use client'

import { Bloque } from '@/shared/ui/bloque'
import type { LeadDeTelefonos } from '../../../entities/telefonos'
import { useAgregarExtraEnPanel } from '../hooks/use-agregar-extra-en-panel'
import { TelefonosExtra } from './telefonos-extra'

type Props = {
  lead: LeadDeTelefonos
  puedeEditarExtras: boolean
  puedeConfigurar: boolean
  // El resumen del listado, con el panel abierto encima, no responde a `?extra=nuevo`: lo atiende éste.
  alCambiar?: () => void
}

// Los teléfonos extra dentro del panel de edición: el mismo componente y las mismas reglas que la ficha. Va **fuera** del `<form>` del panel
// (rotular una fila es un `<form>`, y un formulario no se anida en otro) y se guarda al momento, sin esperar a «Guardar».
export function TelefonosDelPanel({ lead, puedeEditarExtras, puedeConfigurar, alCambiar }: Props) {
  const apertura = useAgregarExtraEnPanel()
  return (
    <Bloque titulo="Teléfonos extra">
      <ul className="grid gap-2 text-(length:--text-sm) text-(--color-ink)">
        <TelefonosExtra
          lead={lead}
          puedeAdministrar={puedeEditarExtras}
          apertura={apertura}
          puedeConfigurar={puedeConfigurar}
          alCambiar={alCambiar}
        />
      </ul>
      {puedeEditarExtras ? (
        <p className="mt-3 text-(length:--text-xs) text-(--color-ink-soft)">
          Se guardan al momento, sin esperar a «Guardar».
        </p>
      ) : null}
    </Bloque>
  )
}
