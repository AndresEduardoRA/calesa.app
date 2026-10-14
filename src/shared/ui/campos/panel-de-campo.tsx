'use client'

import type { CampoBase } from '@/shared/lib/campos'
import { Drawer } from '@/shared/ui/drawer'
import { useUltimo } from '@/shared/ui/use-ultimo'
import { FormularioDeCampo } from './formulario-de-campo'
import type { ConfiguracionDeCampos, EdicionesDeCampos } from './tipos'

type Props<Campo extends CampoBase, Cambios extends object, Nuevo> = {
  // 'nuevo' para crear, el campo de `?campo=` para editar, null con el panel cerrado.
  campo: Campo | 'nuevo' | null
  todos: readonly Campo[]
  puedeGestionar: boolean
  configuracion: ConfiguracionDeCampos<Campo, Cambios, Nuevo>
  ediciones: EdicionesDeCampos<Cambios, Nuevo>
  alCerrar: () => void
}

// El segundo nivel del editor: un campo, con su URL (`?campo=`).
export function PanelDeCampo<Campo extends CampoBase, Cambios extends object, Nuevo>({
  campo,
  ...resto
}: Props<Campo, Cambios, Nuevo>) {
  const aLaVista = useUltimo(campo)
  const existente = aLaVista === 'nuevo' ? null : aLaVista
  const { textos } = resto.configuracion
  return (
    <Drawer
      abierto={campo !== null}
      alCerrar={resto.alCerrar}
      titulo={existente ? existente.etiqueta : textos.panelNuevo}
      descripcion={existente ? textos.panelDescripcionExistente : textos.panelDescripcionNuevo}
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
