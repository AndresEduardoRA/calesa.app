'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { PestanasConDesborde } from '@/shared/ui/pestanas-con-desborde'
import { CLAVE_DE_REPUESTOS } from '../../../entities/selector-de-flujos'

type Props = {
  entradas: readonly { clave: string; titulo: string }[]
  // La clave abierta: el id del origen o `repuestos`.
  valor: string
}

const PARAMETROS = { origen: parseAsString, ambito: parseAsString, fase: parseAsString }

// El selector de flujo: una pestaña por flujo que se puede configurar. Elegir uno escribe `?origen=<id>` o `?ambito=repuestos` (D3) y borra el otro y `?fase=`:
// la fase abierta era de otro flujo. Pide el flujo nuevo al servidor (`shallow: false`).
export function SelectorDeFlujo({ entradas, valor }: Props) {
  const [, setParametros] = useQueryStates(PARAMETROS, { shallow: false })
  return (
    <PestanasConDesborde
      pestanas={entradas}
      valor={valor}
      alElegir={(clave) => {
        void setParametros(
          clave === CLAVE_DE_REPUESTOS
            ? { ambito: CLAVE_DE_REPUESTOS, origen: null, fase: null }
            : { origen: clave, ambito: null, fase: null },
        )
      }}
    />
  )
}
