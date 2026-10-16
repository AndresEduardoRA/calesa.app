'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useTransition } from 'react'
import { enfocarPrimerError } from '@/shared/lib/formularios'
import { useAtajo } from '@/shared/ui/atajos'
import { AvisosDelFormulario } from '@/shared/ui/avisos-del-formulario'
import { Button } from '@/shared/ui/button'
import type { TipoDeSeguimiento } from '../../../entities/alta'
import type { Recordatorio } from '../../../entities/recordatorios'
import type { Seguimiento } from '../../../entities/seguimiento'
import { useRedactor, type Redactor } from '../hooks/use-redactor'
import { CamposDelSeguimiento } from './campos-del-seguimiento'

type Props = {
  leadId: string
  // Los activos. Al editar, el tipo que ya tiene (aunque esté apagado) se ofrece igual.
  tipos: readonly TipoDeSeguimiento[]
  zona: string
  original: Seguimiento | null
  // Con el recordatorio que entró junto, si se pidió uno.
  alGuardar: (seguimiento: Seguimiento, recordatorio: Recordatorio | null) => void
  alCerrar: () => void
}

// «Guardar» espera a que «Recargar» traiga la versión de ahora: antes chocaría otra vez.
function Pie({
  redactor,
  alCerrar,
  recargando,
}: {
  redactor: Redactor
  alCerrar: () => void
  recargando: boolean
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button
        type="button"
        variant="ghost"
        className="min-h-11 md:min-h-9"
        onClick={() => {
          redactor.descartar()
          alCerrar()
        }}
        disabled={redactor.enCurso}
      >
        {redactor.hayAlgoEscrito ? 'Descartar' : 'Cancelar'}
      </Button>
      <Button
        type="submit"
        className="min-h-11 md:min-h-9"
        disabled={redactor.enCurso || recargando}
      >
        {redactor.enCurso ? 'Guardando…' : 'Guardar'}
      </Button>
    </div>
  )
}

// Anotar o editar un seguimiento, en línea (sin URL, como los teléfonos extra): tipo, resumen,
// detalle con formato, cuándo fue y si lo ve el cliente. `Ctrl/Cmd+Enter` o `Ctrl/Cmd+S` guarda;
// `Esc` lo pliega y lo escrito queda como borrador («Descartar» lo tira).
export function RedactorDeSeguimiento({
  leadId,
  tipos,
  zona,
  original,
  alGuardar,
  alCerrar,
}: Props) {
  const router = useRouter()
  const id = useId()
  const formulario = useRef<HTMLFormElement>(null)
  const [recargando, recargar] = useTransition()
  const redactor = useRedactor({
    leadId,
    tipos,
    zona,
    original,
    alGuardar,
    alPerderAcceso: () => {
      router.refresh()
    },
    alRecargar: () => {
      recargar(() => {
        router.refresh()
      })
    },
  })
  useAtajo('cerrar', alCerrar)
  const { errores } = redactor
  useEffect(() => {
    if (Object.keys(errores).length > 0 && formulario.current) {
      enfocarPrimerError(formulario.current)
    }
  }, [errores])
  return (
    <form
      ref={formulario}
      aria-label={original ? 'Editar seguimiento' : 'Anotar seguimiento'}
      className="grid min-w-0 gap-3 rounded-(--radius-lg) border border-(--color-line) bg-(--color-surface) p-3"
      onSubmit={(evento) => {
        evento.preventDefault()
        void redactor.enviar()
      }}
    >
      <AvisosDelFormulario
        enLinea={redactor.enLinea}
        esperandoConexion={redactor.esperandoConexion}
        enCurso={redactor.enCurso}
        conflicto={redactor.conflicto}
        aviso={redactor.aviso}
        detalleDelConflicto="No se guardó nada. Recargar trae la versión de ahora y conserva lo que escribiste."
        alReintentar={() => void redactor.enviar()}
        alRecargar={redactor.recargar}
      />
      <CamposDelSeguimiento
        id={id}
        valores={redactor.valores}
        errores={redactor.errores}
        cambiar={redactor.cambiar}
        tipos={tipos}
        zona={zona}
        deshabilitado={redactor.enCurso}
        original={original}
        conVisible
        conVehiculo
        enfocarResumen
      />
      <Pie redactor={redactor} alCerrar={alCerrar} recargando={recargando} />
    </form>
  )
}
