import { errorDeCampo } from '@/shared/lib/formularios'
import { Bloque } from '@/shared/ui/bloque'
import { Campo } from '@/shared/ui/campo'
import { Interruptor } from '@/shared/ui/interruptor'
import {
  RETENCION_MAXIMA_DIAS,
  RETENCION_MINIMA_DIAS,
  type AjustesEmpresa,
} from '../../../entities/ajustes-empresa'
import type { ErroresDeAjustes } from './campos-de-empresa'

type Props = {
  ajustes: AjustesEmpresa
  registroAbierto: boolean
  alCambiarRegistro: (abierto: boolean) => void
  deshabilitado: boolean
  errores: ErroresDeAjustes
}

// Secundario: nace plegado. Quién puede crear su cuenta y cuánto se guarda lo que se borra.
export function BloquePoliticas(props: Props) {
  const { ajustes, registroAbierto, alCambiarRegistro, deshabilitado, errores } = props
  return (
    <Bloque
      titulo="Políticas"
      descripcion="Quién puede crear su cuenta y cuánto tiempo se guarda lo borrado."
      plegado
    >
      <Interruptor
        titulo="Registro abierto"
        ayuda="Con el registro abierto, cualquiera puede crear su cuenta desde la pantalla de ingreso. Cerrado, sólo entra quien recibe una invitación."
        valor={registroAbierto}
        alCambiar={alCambiarRegistro}
        deshabilitado={deshabilitado}
      />
      <div className="grid items-start gap-4 sm:grid-cols-2">
        <Campo
          nombre="papeleraDias"
          etiqueta="Retención de la papelera (días)"
          type="number"
          inputMode="numeric"
          min={RETENCION_MINIMA_DIAS}
          max={RETENCION_MAXIMA_DIAS}
          defaultValue={ajustes.papeleraDias}
          ayuda="Lo que se manda a la papelera se borra del todo pasado este plazo."
          error={errorDeCampo(errores, 'papeleraDias')}
        />
        <Campo
          nombre="actividadDias"
          etiqueta="Retención de la actividad (días)"
          type="number"
          inputMode="numeric"
          min={RETENCION_MINIMA_DIAS}
          max={RETENCION_MAXIMA_DIAS}
          defaultValue={ajustes.actividadDias}
          ayuda="El registro de quién hizo qué se conserva este plazo."
          error={errorDeCampo(errores, 'actividadDias')}
        />
      </div>
    </Bloque>
  )
}
