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
import type { ContextoDeAlta } from '../../../entities/alta'
import type { CampoDeLead } from '../../../entities/campo'
import { useAltaDeLead, type Guardado, type Paso } from '../hooks/use-alta-de-lead'
import { usePanelDeAlta } from '../hooks/use-panel-de-alta'
import { PanelDeAlta } from './panel-de-alta'

type Props = {
  contexto: ContextoDeAlta
  // Todo el layout de los leads: acá sólo cuentan los activos.
  campos: readonly CampoDeLead[]
}

const ID_DEL_TELEFONO = 'lead-telefono_principal'
const ID_DEL_RESUMEN = 'lead-seguimiento.titulo'

type FocoDelAlta = {
  abierto: boolean
  paso: Paso
  enCurso: boolean
  errores: Record<string, string>
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
  const hayErrores = Object.keys(errores).length > 0
  useEffect(() => {
    if (abierto && hayErrores) {
      enfocarPrimerError(document.getElementById(idFormulario) as HTMLFormElement | null)
    }
  }, [abierto, hayErrores, errores, idFormulario])
}

type PropsDelPie = {
  idFormulario: string
  paso: Paso
  enCurso: boolean
  alVolver: () => void
  alCancelar: () => void
}

// Los botones del drawer: «Volver a los datos» o «Cancelar», y el que avanza o guarda (el mismo que
// Ctrl/Cmd+Enter).
function PieDelAlta({ idFormulario, paso, enCurso, alVolver, alCancelar }: PropsDelPie) {
  const etiqueta =
    paso === 'datos' ? 'Seguir con el seguimiento' : enCurso ? 'Guardando…' : 'Guardar lead'
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button
        variant="ghost"
        onClick={paso === 'seguimiento' ? alVolver : alCancelar}
        disabled={enCurso}
      >
        {paso === 'seguimiento' ? 'Volver a los datos' : 'Cancelar'}
      </Button>
      <Button
        type="submit"
        form={idFormulario}
        disabled={enCurso}
        aria-keyshortcuts="Control+Enter Meta+Enter"
      >
        {etiqueta}
      </Button>
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
    alGuardar: ({ id, numero, adoptado }: Guardado) => {
      avisarExito(`Lead #${String(numero)} ${adoptado ? 'tomado' : 'creado'}`, {
        etiqueta: 'Abrir ficha',
        alHacer: () => {
          router.push(`${RUTAS.leads}/${id}` as Route)
        },
      })
      enfocarTelefono.current = true
    },
  })
  const { paso, enCurso, errores, enviar } = alta

  useTeclaNuevoLead(panel)
  useAtajo('guardarYSeguir', () => void enviar(), panel.abierto)
  useAtajo('guardar', () => void enviar(), panel.abierto)

  useFocoDelAlta({
    abierto: panel.abierto,
    paso,
    enCurso,
    errores,
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
        descripcion={paso === 'datos' ? 'Datos del lead' : 'Primer seguimiento'}
        ancho="amplio"
        pie={
          <PieDelAlta
            idFormulario={idFormulario}
            paso={paso}
            enCurso={enCurso}
            alVolver={alta.volver}
            alCancelar={panel.cerrar}
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
