'use client'

import { Drawer } from '@/shared/ui/drawer'
import { useUltimo } from '@/shared/ui/use-ultimo'
import type { CampoDeLayout } from '../../../entities/campo'
import type { TipoDeOrigen } from '../../../entities/origen'
import type { EdicionesDeCampos } from '../hooks/use-campos'
import { FormularioDeCampo } from './formulario-de-campo'

type Props = {
  // 'nuevo' para crear, el campo de `?campo=` para editar, null con el panel cerrado.
  campo: CampoDeLayout | 'nuevo' | null
  origenId: string
  tipoDeOrigen: TipoDeOrigen
  todos: readonly CampoDeLayout[]
  puedeGestionar: boolean
  ediciones: EdicionesDeCampos
  alCerrar: () => void
}

// El segundo nivel del editor: un campo, con su URL (`?campo=`).
export function PanelDeCampo({ campo, ...resto }: Props) {
  const aLaVista = useUltimo(campo)
  const existente = aLaVista === 'nuevo' ? null : aLaVista
  return (
    <Drawer
      abierto={campo !== null}
      alCerrar={resto.alCerrar}
      titulo={existente ? existente.etiqueta : 'Campo nuevo'}
      descripcion={
        existente
          ? 'Cómo se ve y se usa este dato en los vehículos del origen.'
          : 'Un dato propio de los vehículos de este origen.'
      }
    >
      {aLaVista ? (
        <FormularioDeCampo
          // Al guardar otra persona o yo, el formulario arranca de lo guardado.
          key={existente ? `${existente.id}-${existente.actualizadoEn}` : 'nuevo'}
          campo={existente}
          {...resto}
        />
      ) : null}
    </Drawer>
  )
}
