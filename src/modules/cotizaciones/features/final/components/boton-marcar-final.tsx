'use client'

import { BadgeCheckIcon } from 'lucide-react'
import { useId, useRef } from 'react'
import { buttonVariants } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { PANEL_MARCAR_FINAL } from '../../../entities/final/url'
import { ConfirmarMarcarFinalDiferido } from './diferidos'

type Props = {
  id: string
  numero: number
  // Por qué no se puede marcar todavía (falta el vehículo o el cliente); nulo = se puede.
  motivo: string | null
}

// El botón de «Marcar final» (4.25-2), `outline` como «Revisiones», y su confirmación en `?panel=marcar-final`: recargar lo abre, «atrás» lo cierra. Apagado,
// dice su motivo al lado; la URL escrita a mano no abre el diálogo: avisa el motivo y se limpia. Es un `<button>` con las clases de `<Button>` (sin el primitivo
// de Base UI) y el diálogo se pide al abrirse: el JS en frío de `/cotizaciones/[id]` está al tope (`e2e/presupuesto-js.spec.ts`).
export function BotonMarcarFinal({ id, numero, motivo }: Props) {
  const boton = useRef<HTMLButtonElement>(null)
  const idDelMotivo = useId()
  const url = usePanelPorUrl(PANEL_MARCAR_FINAL)
  const apertura = useApertura(url.abierto)
  const rechazada = useRevisionAlAbrir(url.abierto ? String(apertura) : null, motivo, url.cerrar)
  const abierto = url.abierto && !rechazada && motivo === null
  const montar = useAbiertoAlgunaVez(abierto)
  return (
    <>
      <span className="flex flex-wrap items-center gap-2">
        <button
          ref={boton}
          type="button"
          className={buttonVariants({ variant: 'outline', className: 'min-h-11 md:min-h-9' })}
          disabled={motivo !== null}
          aria-describedby={motivo === null ? undefined : idDelMotivo}
          onClick={() => {
            url.abrir()
          }}
        >
          <BadgeCheckIcon aria-hidden />
          Marcar final
        </button>
        {motivo === null ? null : (
          <span id={idDelMotivo} className="text-(length:--text-sm) text-(--color-ink-soft)">
            {motivo}
          </span>
        )}
      </span>
      {montar ? (
        <ConfirmarMarcarFinalDiferido
          abierto={abierto}
          alCerrar={url.cerrar}
          id={id}
          numero={numero}
          focoAlCerrar={boton}
        />
      ) : null}
    </>
  )
}
