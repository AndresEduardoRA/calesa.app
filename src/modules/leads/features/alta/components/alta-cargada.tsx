'use client'

import { useEffect, useId, useRef, type RefObject } from 'react'
import { enfocarPrimerError } from '@/shared/lib/formularios'
import { useAtajo } from '@/shared/ui/atajos'
import { Button } from '@/shared/ui/button'
import { ConfirmarDescarte } from '@/shared/ui/confirmar-descarte'
import { useRegional } from '@/shared/ui/regional'
import { useCierreConCambios, type CierreConCambios } from '@/shared/ui/use-cierre-con-cambios'
import {
  ID_DEL_SEGUIMIENTO_DEL_ALTA,
  avisoDelPieDelAlta,
  type ContextoDeAlta,
} from '../../../entities/alta'
import type { CampoDeLead } from '../../../entities/campo'
import { useAlGuardarDelAlta } from '../hooks/use-al-guardar-del-alta'
import { useSoltarTrasElEnvio, useTrasElEnvio } from '../hooks/use-tras-el-envio'
import { useAltaDeLead, type AltaDeLead, type Paso } from '../hooks/use-alta-de-lead'
import { usePanelDeAlta } from '../hooks/use-panel-de-alta'
import { EnElMarco, useAjustesDelMarco } from './marco-del-alta'
import { PanelDeAlta } from './panel-de-alta'

type Props = {
  contexto: ContextoDeAlta
  // Todo el layout de los leads: acá sólo cuentan los activos.
  campos: readonly CampoDeLead[]
}

const ID_DEL_TELEFONO = 'lead-telefono_principal'
const ID_DEL_RESUMEN = `${ID_DEL_SEGUIMIENTO_DEL_ALTA}-titulo`
const ID_DEL_AVISO = 'aviso-del-alta'

type FocoDelAlta = {
  abierto: boolean
  paso: Paso
  enCurso: boolean
  // Los motivos, de los datos del lead y del primer seguimiento: cada rechazo nuevo lleva el foco al
  // primero, aunque ya hubiera otros.
  errores: Record<string, string>
  erroresDelSeguimiento: Record<string, string>
  idFormulario: string
  // Se pidió llevar el foco al teléfono apenas los campos dejen de estar deshabilitados.
  enfocarTelefonoRef: RefObject<boolean>
}

// Adónde va el foco: al teléfono tras guardar, al resumen al pasar al seguimiento y al primer error
// después de un envío que no pasó.
function useFocoDelAlta({
  abierto,
  paso,
  enCurso,
  errores,
  erroresDelSeguimiento,
  idFormulario,
  enfocarTelefonoRef,
}: FocoDelAlta) {
  useEffect(() => {
    if (enfocarTelefonoRef.current && !enCurso && abierto) {
      enfocarTelefonoRef.current = false
      document.getElementById(ID_DEL_TELEFONO)?.focus()
    }
  })
  useEffect(() => {
    if (abierto && paso === 'seguimiento') {
      document.getElementById(ID_DEL_RESUMEN)?.focus()
    }
  }, [abierto, paso])
  const hayErrores = Object.keys(errores).length + Object.keys(erroresDelSeguimiento).length > 0
  useEffect(() => {
    if (abierto && hayErrores) {
      enfocarPrimerError(document.getElementById(idFormulario) as HTMLFormElement | null)
    }
  }, [abierto, hayErrores, errores, erroresDelSeguimiento, idFormulario])
}

// Si el formulario llega cuando el drawer ya estaba abierto (esperó la lectura de lo que necesita, o el código), el foco quedó en la espera:
// se lleva al teléfono, que es lo primero que se tipea. Si ya hay un campo con el foco (Base UI lo puso en el teléfono, o se está tipeando),
// no hace nada.
function useFocoAlLlegarAbierto(abierto: boolean) {
  useEffect(() => {
    if (!abierto) {
      return
    }
    let intentos = 0
    const insistir = window.setInterval(() => {
      const enUnCampo = document.activeElement?.closest(
        'input, textarea, select, [contenteditable]',
      )
      const telefono = document.getElementById(ID_DEL_TELEFONO)
      intentos += 1
      if (enUnCampo || (telefono && document.activeElement === telefono)) {
        window.clearInterval(insistir)
      } else if (telefono) {
        telefono.focus()
        window.clearInterval(insistir)
      } else if (intentos > 40) {
        window.clearInterval(insistir)
      }
    }, 25)
    return () => {
      window.clearInterval(insistir)
    }
  }, [abierto])
}

type PropsDelPie = {
  idFormulario: string
  paso: Paso
  enCurso: boolean
  // Hay un primer seguimiento que ofrecer (tipos activos) y si ya se escribió algo.
  conPasoDeSeguimiento: boolean
  hayAlgoEscrito: boolean
  alVolver: () => void
  alCancelar: () => void
  alGuardar: () => void
  // Una salida pendiente (un aviso con «Abrir ficha») con algo escrito: se pregunta en el mismo pie.
  salida: CierreConCambios
}

// Los botones del drawer. En los datos: «Guardar lead» (el lead solo, `Ctrl/Cmd+S`) y «Seguir con el
// seguimiento» (`Ctrl/Cmd+Enter`, el principal: es lo que se hace casi siempre). En el seguimiento:
// «Volver a los datos» y «Guardar lead» (las dos combinaciones guardan). Sin tipos de seguimiento activos
// no hay segundo paso: sólo «Guardar lead». Encima, lo que va a pasar, dicho sin pedir confirmación.
function PieDelAlta(props: PropsDelPie) {
  const { idFormulario, paso, enCurso, conPasoDeSeguimiento, hayAlgoEscrito } = props
  const enLosDatos = paso === 'datos'
  const guardarEsElPrincipal = !enLosDatos || !conPasoDeSeguimiento
  if (props.salida.confirmando) {
    return <ConfirmarDescarte alSeguir={props.salida.seguir} alDescartar={props.salida.descartar} />
  }
  return (
    <div className="grid gap-2">
      <p id={ID_DEL_AVISO} className="text-(length:--text-sm) text-(--color-ink-soft)">
        {avisoDelPieDelAlta({ hayTipos: conPasoDeSeguimiento, hayAlgoEscrito })}
      </p>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="ghost"
          onClick={enLosDatos ? props.alCancelar : props.alVolver}
          disabled={enCurso}
        >
          {enLosDatos ? 'Cancelar' : 'Volver a los datos'}
        </Button>
        <Button
          type="button"
          variant={guardarEsElPrincipal ? 'default' : 'outline'}
          onClick={props.alGuardar}
          disabled={enCurso}
          aria-describedby={ID_DEL_AVISO}
          aria-keyshortcuts={
            guardarEsElPrincipal ? 'Control+Enter Meta+Enter Control+S Meta+S' : 'Control+S Meta+S'
          }
        >
          {enCurso ? 'Guardando…' : 'Guardar lead'}
        </Button>
        {enLosDatos && conPasoDeSeguimiento ? (
          <Button
            type="submit"
            form={idFormulario}
            disabled={enCurso}
            aria-keyshortcuts="Control+Enter Meta+Enter"
          >
            Seguir con el seguimiento
          </Button>
        ) : null}
      </div>
    </div>
  )
}

// Cerrar el drawer no pregunta (el borrador guarda lo escrito): sólo una salida desde un aviso («Abrir ficha»), que lo dejaría
// atrás, pregunta en su pie.
function useSalidaDelAlta(alta: AltaDeLead, panel: ReturnType<typeof usePanelDeAlta>) {
  return useCierreConCambios({
    hayCambios: alta.hayCambios,
    alCerrar: panel.cerrar,
    alDescartar: alta.descartar,
    abierto: panel.abierto,
  })
}

// «Nuevo lead» con todo lo suyo (el estado del alta, los atajos de guardar, el foco, el borrador y el panel). Se pide con `import()` la
// primera vez que se abre (`diferidos.tsx`): el shell sólo trae el botón y la tecla `N`, y esto no viaja en el JS de ninguna otra pantalla.
// El estado vive acá y no en el drawer: una vez montado, cerrarlo no pierde lo escrito. El drawer es uno solo y no es de este componente
// (`marco-del-alta.tsx`): acá se dibuja el cuerpo y el pie en sus dos ranuras, y se le dice la descripción del paso y qué cierra Esc.
export function AltaCargada({ contexto, campos }: Props) {
  const idFormulario = useId()
  const panel = usePanelDeAlta()
  const { zonaHoraria } = useRegional()
  // Tras guardar, el foco vuelve al teléfono cuando los campos dejan de estar deshabilitados.
  const enfocarTelefono = useRef(false)

  // El aviso de guardado espera a que el envío termine (9-7): se encola acá y se suelta con el `enCurso` del alta, que sale del hook de abajo.
  const tras = useTrasElEnvio()
  const alGuardar = useAlGuardarDelAlta(panel, enfocarTelefono, tras.despues)
  const alta = useAltaDeLead({
    contexto,
    layout: campos,
    zona: zonaHoraria,
    abierto: panel.abierto,
    alGuardar,
  })
  const { paso, enCurso, enviar, guardar } = alta
  useSoltarTrasElEnvio(tras, enCurso)
  const salida = useSalidaDelAlta(alta, panel)
  useFocoAlLlegarAbierto(panel.abierto)

  useAtajo('guardarYSeguir', () => void enviar(), panel.abierto)
  useAtajo('guardar', () => void guardar(), panel.abierto)

  useFocoDelAlta({
    abierto: panel.abierto,
    paso,
    enCurso,
    errores: alta.errores,
    erroresDelSeguimiento: alta.erroresDelSeguimiento,
    idFormulario,
    enfocarTelefonoRef: enfocarTelefono,
  })

  // Esc: del seguimiento vuelve a los datos; desde los datos cierra.
  function cerrar() {
    if (paso === 'seguimiento') {
      alta.volver()
    } else {
      panel.cerrar()
    }
  }
  useAjustesDelMarco(paso === 'datos' ? 'Datos del lead' : 'Primer seguimiento (opcional)', cerrar)

  return (
    <>
      <EnElMarco donde="cuerpo">
        <PanelDeAlta
          id={idFormulario}
          alta={alta}
          contexto={contexto}
          campos={campos}
          zona={zonaHoraria}
          // Abierto desde la hoja (`?elegir=`): si el teléfono ya es de un lead que se ve, el aviso ofrece elegirlo en vez de crear otro.
          {...(panel.paraElegir === null ? {} : { alElegir: panel.elegirElCreado })}
        />
      </EnElMarco>
      <EnElMarco donde="pie">
        <PieDelAlta
          idFormulario={idFormulario}
          paso={paso}
          enCurso={enCurso}
          conPasoDeSeguimiento={alta.conPasoDeSeguimiento}
          hayAlgoEscrito={alta.hayAlgoEscrito}
          alVolver={alta.volver}
          alCancelar={panel.cerrar}
          alGuardar={() => void guardar()}
          salida={salida}
        />
      </EnElMarco>
    </>
  )
}
