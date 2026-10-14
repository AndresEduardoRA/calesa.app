import { errorDeCampo } from '@/shared/lib/formularios'
import { Bloque } from '@/shared/ui/bloque'
import { Campo } from '@/shared/ui/campo'
import { Interruptor } from '@/shared/ui/interruptor'
import {
  GRACIA_MAXIMA_DIAS,
  GRACIA_MINIMA_DIAS,
  RETENCION_MAXIMA_DIAS,
  RETENCION_MINIMA_DIAS,
  type AjustesEmpresa,
} from '../../../entities/ajustes-empresa'
import type { ErroresDeAjustes } from './campos-de-empresa'

type Props = {
  ajustes: AjustesEmpresa
  registroAbierto: boolean
  alCambiarRegistro: (abierto: boolean) => void
  limpiezaAutomatica: boolean
  alCambiarLimpieza: (encendida: boolean) => void
  deshabilitado: boolean
  errores: ErroresDeAjustes
}

// Secundario: nace plegado. Quién puede crear su cuenta y cuánto se guarda lo que se borra.
export function BloquePoliticas(props: Props) {
  const { ajustes, registroAbierto, alCambiarRegistro, deshabilitado, errores } = props
  const { limpiezaAutomatica, alCambiarLimpieza } = props
  return (
    <Bloque
      titulo="Políticas"
      descripcion="Quién puede crear su cuenta, cuánto tiempo se guarda lo borrado y la limpieza automática."
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
      <Interruptor
        titulo="Limpieza automática de subastas"
        ayuda="Cada madrugada, los vehículos importados de una subasta que terminó hace más de los días de gracia y que nadie usa se mandan solos a la papelera. Se avisa antes en el listado y en la ficha, y se puede conservar uno. Apagada, no se mueve nada ni se muestra ningún aviso."
        valor={limpiezaAutomatica}
        alCambiar={alCambiarLimpieza}
        deshabilitado={deshabilitado}
      />
      <Campo
        nombre="limpiezaDiasGracia"
        etiqueta="Días de gracia de la limpieza"
        type="number"
        inputMode="numeric"
        min={GRACIA_MINIMA_DIAS}
        max={GRACIA_MAXIMA_DIAS}
        defaultValue={ajustes.limpiezaDiasGracia}
        ayuda="Días que pasan desde que terminó la subasta hasta que el vehículo, si no tiene nada vinculado ni registrado, va a la papelera."
        error={errorDeCampo(errores, 'limpiezaDiasGracia')}
      />
    </Bloque>
  )
}
