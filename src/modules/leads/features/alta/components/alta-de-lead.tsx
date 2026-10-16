'use client'

import { PlusIcon } from 'lucide-react'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, type RefObject } from 'react'
import { enfocarPrimerError } from '@/shared/lib/formularios'
import { RUTAS } from '@/shared/lib/rutas'
import { useAtajo } from '@/shared/ui/atajos'
import { Button } from '@/shared/ui/button'
import { Drawer } from '@/shared/ui/drawer'
import { useRegional } from '@/shared/ui/regional'
import { avisarExito } from '@/shared/ui/toasts'
import {
  ID_DEL_SEGUIMIENTO_DEL_ALTA,
  avisoDelPieDelAlta,
  textoDeLeadGuardado,
  type ContextoDeAlta,
} from '../../../entities/alta'
import type { CampoDeLead } from '../../../entities/campo'
import { CLAVE_DE_SECCION } from '../../../entities/ficha'
import { useAltaDeLead, type Guardado, type Paso } from '../hooks/use-alta-de-lead'
import { usePanelDeAlta } from '../hooks/use-panel-de-alta'
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
}

// Los botones del drawer. En los datos: «Guardar lead» (el lead solo, `Ctrl/Cmd+S`) y «Seguir con el
// seguimiento» (`Ctrl/Cmd+Enter`, el principal: es lo que se hace casi siempre). En el seguimiento:
// «Volver a los datos» y «Guardar lead» (las dos combinaciones guardan). Sin tipos de seguimiento activos
// no hay segundo paso: sólo «Guardar lead». Encima, lo que va a pasar, dicho sin pedir confirmación.
function PieDelAlta(props: PropsDelPie) {
  const { idFormulario, paso, enCurso, conPasoDeSeguimiento, hayAlgoEscrito } = props
  const enLosDatos = paso === 'datos'
  const guardarEsElPrincipal = !enLosDatos || !conPasoDeSeguimiento
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

// `N` abre «Nuevo lead» donde la pantalla no tiene un «nuevo» propio: de respaldo mientras está
// cerrado, porque esta alta hidrata detrás de su propio Suspense y, sin eso, taparía al de la
// pantalla. Con el drawer abierto responde de verdad, y no hace nada: ninguna otra `N` se cuela.
function useTeclaNuevoLead(panel: ReturnType<typeof usePanelDeAlta>): void {
  useAtajo(
    'nuevo',
    () => {
      if (!panel.abierto) {
        panel.abrir()
      }
    },
    true,
    { respaldo: !panel.abierto },
  )
}

// «Nuevo lead»: el botón de la barra superior, la tecla N y el drawer (`?panel=nuevo-lead`), desde
// cualquier pantalla. Sólo se monta con `leads.crear`: sin él no hay botón, ni atajo, ni URL que
// abra nada. El estado vive acá y no en el drawer: cerrarlo no pierde lo escrito.
export function AltaDeLead({ contexto, campos }: Props) {
  const idFormulario = useId()
  const router = useRouter()
  const panel = usePanelDeAlta()
  const { zonaHoraria } = useRegional()
  // Tras guardar, el foco vuelve al teléfono cuando los campos dejan de estar deshabilitados.
  const enfocarTelefono = useRef(false)

  const alta = useAltaDeLead({
    contexto,
    layout: campos,
    zona: zonaHoraria,
    abierto: panel.abierto,
    alGuardar: ({ id, numero, adoptado, conSeguimiento }: Guardado) => {
      // Sin primer seguimiento, «Abrir ficha» lleva a donde se anota después.
      const seccion = conSeguimiento ? '' : `?${CLAVE_DE_SECCION}=seguimientos`
      avisarExito(textoDeLeadGuardado({ numero, adoptado, conSeguimiento }), {
        etiqueta: 'Abrir ficha',
        alHacer: () => {
          router.push(`${RUTAS.leads}/${id}${seccion}` as Route)
        },
      })
      enfocarTelefono.current = true
    },
  })
  const { paso, enCurso, enviar, guardar } = alta

  useTeclaNuevoLead(panel)
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

  return (
    <>
      <Button size="sm" aria-label="Nuevo lead" onClick={panel.abrir} aria-keyshortcuts="N">
        <PlusIcon aria-hidden />
        <span className="hidden sm:inline">Nuevo lead</span>
      </Button>
      <Drawer
        abierto={panel.abierto}
        alCerrar={cerrar}
        titulo="Nuevo lead"
        descripcion={paso === 'datos' ? 'Datos del lead' : 'Primer seguimiento (opcional)'}
        ancho="amplio"
        pie={
          <PieDelAlta
            idFormulario={idFormulario}
            paso={paso}
            enCurso={enCurso}
            conPasoDeSeguimiento={alta.conPasoDeSeguimiento}
            hayAlgoEscrito={alta.hayAlgoEscrito}
            alVolver={alta.volver}
            alCancelar={panel.cerrar}
            alGuardar={() => void guardar()}
          />
        }
      >
        <PanelDeAlta
          id={idFormulario}
          alta={alta}
          contexto={contexto}
          campos={campos}
          zona={zonaHoraria}
        />
      </Drawer>
    </>
  )
}
