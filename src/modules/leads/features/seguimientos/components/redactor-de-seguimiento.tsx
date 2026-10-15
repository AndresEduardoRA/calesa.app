'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState, useTransition } from 'react'
import { enfocarPrimerError } from '@/shared/lib/formularios'
import { useAtajo } from '@/shared/ui/atajos'
import { AvisosDelFormulario } from '@/shared/ui/avisos-del-formulario'
import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { Interruptor } from '@/shared/ui/interruptor'
import type { TipoDeSeguimiento } from '../../../entities/alta'
import type { Recordatorio } from '../../../entities/recordatorios'
import { CampoCuando } from '../../recordatorios/components/campo-cuando'
import {
  ETIQUETA_DE_VISIBLE,
  LARGO_MAXIMO_DEL_TITULO,
  type Seguimiento,
} from '../../../entities/seguimiento'
import { useRedactor, type Redactor } from '../hooks/use-redactor'
import { EditorDiferido } from './editor-diferido'

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

type Parte = { redactor: Redactor; id: string }

// Los tipos que se ofrecen: los activos y, al editar, el que ya tiene aunque esté apagado.
function opcionesDeTipo(tipos: readonly TipoDeSeguimiento[], original: Seguimiento | null) {
  const opciones = tipos.map((t) => ({ valor: t.id, etiqueta: t.nombre }))
  if (original && !tipos.some((t) => t.id === original.tipoId)) {
    opciones.unshift({ valor: original.tipoId, etiqueta: `${original.tipoNombre} (inactivo)` })
  }
  return opciones
}

// «Ahora» por defecto al anotar; otra fecha, si fue antes. Al editar, la que tiene.
function Fecha({ redactor, id, nuevo }: Parte & { nuevo: boolean }) {
  const [abierta, setAbierta] = useState(!nuevo || redactor.valores.ocurridoEn !== '')
  if (!abierta) {
    return (
      <div className="grid gap-1.5">
        <span className="text-(length:--text-sm) font-medium text-(--color-ink)">Cuándo fue</span>
        <div className="flex items-center gap-2">
          <span className="text-(length:--text-sm) text-(--color-ink-soft)">Ahora</span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="min-h-11 md:min-h-7"
            onClick={() => {
              setAbierta(true)
            }}
          >
            Otra fecha
          </Button>
        </div>
      </div>
    )
  }
  return (
    <Campo
      nombre={`${id}-ocurrido`}
      etiqueta="Cuándo fue"
      type="datetime-local"
      value={redactor.valores.ocurridoEn}
      onChange={(evento) => {
        redactor.cambiar('ocurridoEn', evento.target.value)
      }}
      error={redactor.errores.ocurridoEn}
      disabled={redactor.enCurso}
    />
  )
}

function TipoYResumen({
  redactor,
  id,
  original,
  tipos,
}: Parte & Pick<Props, 'original' | 'tipos'>) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <CampoSeleccion
          nombre={`${id}-tipo`}
          etiqueta="Tipo de seguimiento"
          opciones={opcionesDeTipo(tipos, original)}
          value={redactor.valores.tipoId}
          onChange={(evento) => {
            redactor.cambiar('tipoId', evento.target.value)
          }}
          error={redactor.errores.tipoId}
          disabled={redactor.enCurso}
        />
        <Fecha redactor={redactor} id={id} nuevo={original === null} />
      </div>
      <Campo
        nombre={`${id}-titulo`}
        etiqueta="Resumen"
        autoComplete="off"
        autoFocus
        maxLength={LARGO_MAXIMO_DEL_TITULO}
        value={redactor.valores.titulo}
        onChange={(evento) => {
          redactor.cambiar('titulo', evento.target.value)
        }}
        error={redactor.errores.titulo}
        disabled={redactor.enCurso}
      />
    </>
  )
}

// El detalle con formato: el editor llega aparte, recién al abrir el redactor.
function Detalle({ redactor, id }: Parte) {
  const etiqueta = `${id}-detalle`
  const errorId = redactor.errores.detalle ? `${id}-detalle-error` : undefined
  return (
    <div className="grid gap-1.5">
      <span id={etiqueta} className="text-(length:--text-sm) font-medium text-(--color-ink)">
        Detalle (opcional)
      </span>
      <EditorDiferido
        valor={redactor.valores.detalle}
        alCambiar={(documento) => {
          redactor.cambiar('detalle', documento)
        }}
        etiquetaId={etiqueta}
        {...(errorId ? { errorId } : {})}
        invalido={errorId !== undefined}
        deshabilitado={redactor.enCurso}
      />
      {errorId ? (
        <p id={errorId} className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {redactor.errores.detalle}
        </p>
      ) : null}
    </div>
  )
}

function Visible({ redactor }: { redactor: Redactor }) {
  return (
    <Interruptor
      titulo={ETIQUETA_DE_VISIBLE}
      ayuda={
        redactor.valores.visible
          ? 'Lo verán el cliente y quienes comparten este lead contigo.'
          : 'Sólo lo ves tú.'
      }
      valor={redactor.valores.visible}
      alCambiar={(valor) => {
        redactor.cambiar('visible', valor)
      }}
      deshabilitado={redactor.enCurso}
    />
  )
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
      <TipoYResumen redactor={redactor} id={id} original={original} tipos={tipos} />
      <Detalle redactor={redactor} id={id} />
      <Visible redactor={redactor} />
      {original ? null : (
        <CampoCuando
          nombre={`${id}-recordatorio`}
          etiqueta="Recordatorio (opcional)"
          valor={redactor.valores.recordatorio}
          alCambiar={(valor) => {
            redactor.cambiar('recordatorio', valor)
          }}
          zona={zona}
          error={redactor.errores.recordatorio}
          deshabilitado={redactor.enCurso}
          quitable
        />
      )}
      <Pie redactor={redactor} alCerrar={alCerrar} recargando={recargando} />
    </form>
  )
}
