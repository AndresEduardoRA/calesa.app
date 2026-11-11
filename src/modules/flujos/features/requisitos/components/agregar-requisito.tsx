'use client'

import { PlusIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import type { FlujoParaConfigurar } from '../../../entities/flujo'
import {
  CLAVE_AGREGAR,
  FORMA_DE_DATO,
  clavesQueFaltan,
} from '../../../entities/requisitos/vista-de-fase'
import type { RequisitosDeLaFase } from '../hooks/use-requisitos-de-la-fase'
import { FormularioDeDatoDiferido } from './diferidos'

type Props = { flujo: FlujoParaConfigurar; requisitos: RequisitosDeLaFase; prefijo: string }

const BOTON = 'h-11 md:h-8'
const MOTIVO_SIN_DATOS = 'Esta fase ya pide todos los datos que este flujo ofrece.'

// «Agregar requisito» (`?agregar=dato`): el botón y, abierto, el formulario en línea. Hoy sólo de dato; la 5.08-2 suma las otras dos formas. Sin datos que
// ofrecer (la fase ya los pide todos), el botón queda apagado y lo dice.
export function AgregarRequisito({ flujo, requisitos, prefijo }: Props) {
  const url = usePanelPorUrl(FORMA_DE_DATO, [], { clave: CLAVE_AGREGAR })
  const quedanDatos = clavesQueFaltan(flujo.ambito, requisitos.requisitos).length > 0
  if (url.abierto) {
    return <FormularioDeDatoDiferido flujo={flujo} requisitos={requisitos} alCerrar={url.cerrar} />
  }
  return (
    <div className="grid justify-items-start gap-1.5">
      <Button
        variant="outline"
        className={BOTON}
        disabled={!quedanDatos}
        aria-describedby={quedanDatos ? undefined : `${prefijo}-sin-datos`}
        onClick={() => {
          url.abrir()
        }}
      >
        <PlusIcon aria-hidden />
        Agregar requisito
      </Button>
      {quedanDatos ? null : (
        <p id={`${prefijo}-sin-datos`} className="text-(length:--text-sm) text-(--color-ink-soft)">
          {MOTIVO_SIN_DATOS}
        </p>
      )}
    </div>
  )
}
