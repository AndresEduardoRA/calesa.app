'use client'

import { Button } from '@/shared/ui/button'
import type { FlujoParaConfigurar } from '../../../entities/flujo'
import {
  FORMA_DE_DATO,
  FORMA_DE_DOCUMENTO,
  FORMA_DE_ESPERA,
  clavesQueFaltan,
  reglaDeEsperasActiva,
  type FormaDeAgregar,
} from '../../../entities/requisitos/vista-de-fase'
import type { RequisitosDeLaFase } from '../hooks/use-requisitos-de-la-fase'

type Props = {
  flujo: FlujoParaConfigurar
  requisitos: RequisitosDeLaFase
  prefijo: string
  alElegir: (forma: FormaDeAgregar) => void
  alCancelar: () => void
}

const BOTON = 'h-11 md:h-8'
export const MOTIVO_SIN_DATOS = 'Esta fase ya pide todos los datos que este flujo ofrece.'
export const MOTIVO_SIN_ESPERAS = 'Enciende la regla «Esperas» del flujo para pedir una espera.'

// Qué pide el requisito nuevo: un dato, un documento o una espera. Cada forma se abre en línea (`?forma=`). «Dato» se apaga si la fase ya los pide todos y
// «Espera» si la regla «Esperas» del flujo está apagada; el motivo queda escrito debajo, no sólo en un tooltip.
export function SelectorDeForma({ flujo, requisitos, prefijo, alElegir, alCancelar }: Props) {
  const quedanDatos = clavesQueFaltan(flujo.ambito, requisitos.requisitos).length > 0
  const hayEsperas = reglaDeEsperasActiva(flujo)
  return (
    <div
      role="group"
      aria-label="Qué requisito agregar"
      className="grid gap-2 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3"
    >
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          className={BOTON}
          autoFocus
          disabled={!quedanDatos}
          aria-describedby={quedanDatos ? undefined : `${prefijo}-sin-datos`}
          onClick={() => {
            alElegir(FORMA_DE_DATO)
          }}
        >
          Dato
        </Button>
        <Button
          variant="outline"
          className={BOTON}
          onClick={() => {
            alElegir(FORMA_DE_DOCUMENTO)
          }}
        >
          Documento
        </Button>
        <Button
          variant="outline"
          className={BOTON}
          disabled={!hayEsperas}
          aria-describedby={hayEsperas ? undefined : `${prefijo}-sin-esperas`}
          onClick={() => {
            alElegir(FORMA_DE_ESPERA)
          }}
        >
          Espera
        </Button>
        <Button variant="ghost" className={BOTON} onClick={alCancelar}>
          Cancelar
        </Button>
      </div>
      {quedanDatos ? null : (
        <p id={`${prefijo}-sin-datos`} className="text-(length:--text-sm) text-(--color-ink-soft)">
          {MOTIVO_SIN_DATOS}
        </p>
      )}
      {hayEsperas ? null : (
        <p
          id={`${prefijo}-sin-esperas`}
          className="text-(length:--text-sm) text-(--color-ink-soft)"
        >
          {MOTIVO_SIN_ESPERAS}
        </p>
      )}
    </div>
  )
}
