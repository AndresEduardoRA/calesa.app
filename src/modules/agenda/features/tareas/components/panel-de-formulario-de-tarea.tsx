'use client'

import { useId, useState } from 'react'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { CambiosSinGuardar } from '@/shared/ui/cambios-sin-guardar'
import { Drawer } from '@/shared/ui/drawer'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'
import type { DetalleDeTarea } from '../../../entities/detalle'
import { valoresInicialesDeTarea } from '../../../entities/edicion'
import { useFormularioDeTarea } from '../hooks/use-formulario-de-tarea'
import { CamposDeTarea } from './campos-de-tarea'

type Props = {
  // La tarea que se edita; nula = «Nueva tarea».
  tarea: DetalleDeTarea | null
  // El día de la vista y el de hoy: de ahí salen los valores de partida de una tarea nueva.
  fecha: string
  hoy: string
  zona: string
  puedeElegirResponsable: boolean
  alCrear: (id: string) => void
  alGuardar: () => void
  alCancelar: () => void
  alCerrar: () => void
}

// «Nueva tarea» o «Editar tarea»: un Drawer con su URL (`?panel=nueva-tarea` o `?tarea=<id>&editar=1`). Crear lleva al detalle de la tarea nueva.
export function PanelDeFormularioDeTarea({
  tarea,
  fecha,
  hoy,
  zona,
  puedeElegirResponsable,
  alCrear,
  alGuardar,
  alCancelar,
  alCerrar,
}: Props) {
  const [inicial] = useState(() =>
    valoresInicialesDeTarea(fecha, hoy, zona, new Date().toISOString()),
  )
  const formulario = useFormularioDeTarea({ tarea, inicial, zona, alCrear, alGuardar })
  const idFormulario = useId()
  return (
    <Drawer
      abierto
      alCerrar={alCerrar}
      titulo={tarea ? 'Editar tarea' : 'Nueva tarea'}
      pie={
        <PieDelPanel
          idFormulario={idFormulario}
          enCurso={formulario.enCurso}
          alCancelar={alCancelar}
          etiquetaDeGuardar={tarea ? 'Guardar' : 'Crear tarea'}
          sinPuedeEnviar={formulario.sinCambios}
        />
      }
    >
      <CambiosSinGuardar hayCambios={formulario.hayCambios} />
      <form
        id={idFormulario}
        className="grid gap-4"
        noValidate
        onSubmit={(accion) => {
          accion.preventDefault()
          void formulario.enviar(new Date().toISOString())
        }}
      >
        {formulario.conflicto ? (
          <AvisoDeConflicto mensaje={formulario.conflicto} alRecargar={formulario.recargar} />
        ) : null}
        <CamposDeTarea
          formulario={formulario}
          puedeElegirResponsable={puedeElegirResponsable}
          creando={tarea === null}
        />
      </form>
    </Drawer>
  )
}
