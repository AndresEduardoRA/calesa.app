'use client'

import { PlusIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import type { FlujoParaConfigurar } from '../../../entities/flujo'
import {
  FORMA_DE_DATO,
  FORMA_DE_DOCUMENTO,
  FORMA_DE_ELEGIR,
  FORMA_DE_ESPERA,
} from '../../../entities/requisitos/vista-de-fase'
import type { useAgregarRequisito } from '../hooks/use-agregar-requisito'
import type { RequisitosDeLaFase } from '../hooks/use-requisitos-de-la-fase'
import {
  FormularioDeDatoDiferido,
  FormularioDeDocumentoDiferido,
  FormularioDeEsperaDiferido,
} from './diferidos'
import { SelectorDeForma } from './selector-de-forma'

type Props = {
  flujo: FlujoParaConfigurar
  requisitos: RequisitosDeLaFase
  agregar: ReturnType<typeof useAgregarRequisito>
  prefijo: string
}

const BOTON = 'h-11 md:h-8'

// «Agregar requisito» (`?agregar=nuevo&forma=…`): el botón; abierto, el selector de la forma y, elegida, su formulario en línea (dato, documento o espera).
export function AgregarRequisito({ flujo, requisitos, agregar, prefijo }: Props) {
  const { forma } = agregar
  if (forma === FORMA_DE_DATO) {
    return (
      <FormularioDeDatoDiferido flujo={flujo} requisitos={requisitos} alCerrar={agregar.cerrar} />
    )
  }
  if (forma === FORMA_DE_DOCUMENTO) {
    return <FormularioDeDocumentoDiferido requisitos={requisitos} alCerrar={agregar.cerrar} />
  }
  if (forma === FORMA_DE_ESPERA) {
    return (
      <FormularioDeEsperaDiferido flujo={flujo} requisitos={requisitos} alCerrar={agregar.cerrar} />
    )
  }
  if (forma === FORMA_DE_ELEGIR) {
    return (
      <SelectorDeForma
        flujo={flujo}
        requisitos={requisitos}
        prefijo={prefijo}
        alElegir={agregar.abrir}
        alCancelar={agregar.cerrar}
      />
    )
  }
  return (
    <div className="grid justify-items-start gap-1.5">
      <Button
        variant="outline"
        className={BOTON}
        onClick={() => {
          agregar.abrir(FORMA_DE_ELEGIR)
        }}
      >
        <PlusIcon aria-hidden />
        Agregar requisito
      </Button>
    </div>
  )
}
