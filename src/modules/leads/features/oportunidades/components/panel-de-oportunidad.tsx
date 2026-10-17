'use client'

import { useId } from 'react'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { CambiosSinGuardar } from '@/shared/ui/cambios-sin-guardar'
import { Drawer } from '@/shared/ui/drawer'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'
import type { Embudo } from '../../../entities/embudo'
import type { Oportunidad } from '../../../entities/oportunidad'
import { useFormularioDeOportunidad } from '../hooks/use-formulario-de-oportunidad'
import { CamposDeOportunidad } from './campos-de-oportunidad'

type Props = {
  leadId: string
  // La que se edita; null = «Nueva oportunidad».
  oportunidad: Oportunidad | null
  embudos: readonly Embudo[]
  alCerrar: () => void
}

// «Nueva oportunidad» o «Editar»: un Drawer con su URL. Una nueva entra en la etapa inicial de su
// embudo; se mueve después con «Mover a…».
export function PanelDeOportunidad({ leadId, oportunidad, embudos, alCerrar }: Props) {
  const formulario = useFormularioDeOportunidad({ leadId, oportunidad, alTerminar: alCerrar })
  const idFormulario = useId()
  return (
    <Drawer
      abierto
      alCerrar={alCerrar}
      titulo={oportunidad ? 'Editar oportunidad' : 'Nueva oportunidad'}
      descripcion={
        oportunidad ? undefined : 'Entra en la etapa inicial de tu embudo. Sólo tú la ves.'
      }
      pie={
        <PieDelPanel
          idFormulario={idFormulario}
          enCurso={formulario.enCurso}
          alCancelar={alCerrar}
          etiquetaDeGuardar={oportunidad ? 'Guardar' : 'Crear oportunidad'}
          sinPuedeEnviar={formulario.sinCambios}
        />
      }
    >
      <CambiosSinGuardar hayCambios={formulario.hayCambios} />
      <form
        id={idFormulario}
        className="grid gap-4"
        onSubmit={(evento) => {
          evento.preventDefault()
          void formulario.enviar()
        }}
      >
        {formulario.conflicto ? (
          <AvisoDeConflicto mensaje={formulario.conflicto} alRecargar={formulario.recargar} />
        ) : null}
        <CamposDeOportunidad formulario={formulario} oportunidad={oportunidad} embudos={embudos} />
      </form>
    </Drawer>
  )
}
