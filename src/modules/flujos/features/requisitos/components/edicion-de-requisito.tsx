'use client'

import type { RequisitoParaConfigurar } from '../../../entities/flujo'
import type { RequisitosDeLaFase } from '../hooks/use-requisitos-de-la-fase'
import { FormularioDeEdicionDiferido } from './diferidos'

type Props = {
  requisitos: RequisitosDeLaFase
  requisito: RequisitoParaConfigurar
  prefijo: string
  cerrar: () => void
}

// El formulario de «Editar» de un requisito, con su tipo de documento ya leído (si lo hay). Al cerrarse el foco vuelve al «⋯» de su fila, que sigue ahí.
export function EdicionDeRequisito({ requisitos, requisito, prefijo, cerrar }: Props) {
  const tipo = requisitos.opciones.opciones?.tipos.find((t) => t.id === requisito.tipoDocumentoId)
  return (
    <FormularioDeEdicionDiferido
      key={requisito.id}
      requisitos={requisitos}
      requisito={requisito}
      descripcion={requisitos.describir(requisito)}
      tipo={tipo ?? null}
      alCerrar={() => {
        cerrar()
        requestAnimationFrame(() => {
          document
            .querySelector<HTMLElement>(`[data-mas-acciones="${prefijo}-${requisito.id}"]`)
            ?.focus()
        })
      }}
    />
  )
}
