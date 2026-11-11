'use client'

import { useId, useState } from 'react'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { CambiosSinGuardar } from '@/shared/ui/cambios-sin-guardar'
import { Drawer } from '@/shared/ui/drawer'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'
import type { DetalleDeEvento } from '../../../entities/detalle'
import { valoresInicialesDeEvento } from '../../../entities/edicion'
import { useFormularioDeEvento } from '../hooks/use-formulario-de-evento'
import { CamposDeEvento } from './campos-de-evento'

type Props = {
  // El evento que se edita; nulo = «Nuevo evento».
  evento: DetalleDeEvento | null
  // El día de la vista y el de hoy: de ahí salen los valores de partida de un evento nuevo.
  fecha: string
  hoy: string
  zona: string
  puedePublicar: boolean
  alCrear: (id: string) => void
  alGuardar: () => void
  alCancelar: () => void
  alCerrar: () => void
}

// «Nuevo evento» o «Editar evento»: un Drawer con su URL (`?panel=nuevo-evento` o `?evento=<id>&editar=1`). Crear lleva al detalle del evento nuevo.
export function PanelDeFormularioDeEvento({
  evento,
  fecha,
  hoy,
  zona,
  puedePublicar,
  alCrear,
  alGuardar,
  alCancelar,
  alCerrar,
}: Props) {
  const [inicial] = useState(() => valoresInicialesDeEvento(fecha, hoy))
  const formulario = useFormularioDeEvento({ evento, inicial, zona, alCrear, alGuardar })
  const idFormulario = useId()
  return (
    <Drawer
      abierto
      alCerrar={alCerrar}
      titulo={evento ? 'Editar evento' : 'Nuevo evento'}
      pie={
        <PieDelPanel
          idFormulario={idFormulario}
          enCurso={formulario.enCurso}
          alCancelar={alCancelar}
          etiquetaDeGuardar={evento ? 'Guardar' : 'Crear evento'}
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
          void formulario.enviar()
        }}
      >
        {formulario.conflicto ? (
          <AvisoDeConflicto mensaje={formulario.conflicto} alRecargar={formulario.recargar} />
        ) : null}
        <CamposDeEvento formulario={formulario} puedePublicar={puedePublicar} />
      </form>
    </Drawer>
  )
}
