'use client'

import { Campo } from '@/shared/ui/campo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { Interruptor } from '@/shared/ui/interruptor'
import type { TipoDeSeguimiento } from '../../../entities/alta'
import {
  ETIQUETA_DE_VISIBLE,
  LARGO_MAXIMO_DEL_TITULO,
  type ErroresDelSeguimiento,
  type Seguimiento,
  type ValoresDelSeguimiento,
} from '../../../entities/seguimiento'
import { CampoVehiculo } from '../../recordatorios/components/campo-vehiculo'
import { CuandoFue } from './cuando-fue'
import { EditorDiferido } from './editor-diferido'
import { ProximoContacto } from './proximo-contacto'

export type CambiarSeguimiento = <K extends keyof ValoresDelSeguimiento>(
  clave: K,
  valor: ValoresDelSeguimiento[K],
) => void

type Props = {
  // Prefija el `id` de cada control; el resumen es `${id}-titulo`.
  id: string
  valores: ValoresDelSeguimiento
  errores: ErroresDelSeguimiento
  cambiar: CambiarSeguimiento
  // Los activos. Al editar, el tipo que ya tiene (aunque esté apagado) se ofrece igual.
  tipos: readonly TipoDeSeguimiento[]
  zona: string
  deshabilitado: boolean
  // Nulo = anotar uno nuevo (con «Próximo contacto»).
  original: Seguimiento | null
  // «Visible para el cliente» y el vehículo del lead son de la ficha: el alta no los ofrece.
  conVisible?: boolean
  conVehiculo?: boolean
  // El resumen toma el foco al montarse (el contenedor puede preferir llevarlo él).
  enfocarResumen?: boolean
}

// Los tipos que se ofrecen: los activos y, al editar, el que ya tiene aunque esté apagado.
function opcionesDeTipo(tipos: readonly TipoDeSeguimiento[], original: Seguimiento | null) {
  const opciones = tipos.map((t) => ({ valor: t.id, etiqueta: t.nombre }))
  if (original && !tipos.some((t) => t.id === original.tipoId)) {
    opciones.unshift({ valor: original.tipoId, etiqueta: `${original.tipoNombre} (inactivo)` })
  }
  return opciones
}

type Parte = Pick<Props, 'id' | 'valores' | 'errores' | 'cambiar' | 'deshabilitado'>

function Detalle({ id, valores, errores, cambiar, deshabilitado }: Parte) {
  const etiqueta = `${id}-detalle`
  const errorId = errores.detalle ? `${id}-detalle-error` : undefined
  return (
    <div className="grid gap-1.5">
      <span id={etiqueta} className="text-(length:--text-sm) font-medium text-(--color-ink)">
        Detalle (opcional)
      </span>
      <EditorDiferido
        valor={valores.detalle}
        alCambiar={(documento) => {
          cambiar('detalle', documento)
        }}
        etiquetaId={etiqueta}
        {...(errorId ? { errorId } : {})}
        invalido={errorId !== undefined}
        deshabilitado={deshabilitado}
      />
      {errorId ? (
        <p id={errorId} className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {errores.detalle}
        </p>
      ) : null}
    </div>
  )
}

function Visible({ valores, cambiar, deshabilitado }: Parte) {
  return (
    <Interruptor
      titulo={ETIQUETA_DE_VISIBLE}
      ayuda={
        valores.visible
          ? 'Lo verán el cliente y quienes comparten este lead contigo.'
          : 'Sólo lo ves tú.'
      }
      valor={valores.visible}
      alCambiar={(valor) => {
        cambiar('visible', valor)
      }}
      deshabilitado={deshabilitado}
    />
  )
}

// Un solo conjunto de campos del seguimiento —tipo, cuándo fue, resumen, detalle con formato y
// próximo contacto— para la ficha y para el alta (y, desde las partes 9c y 9d, para los modales). No es
// un formulario: no tiene pie, ni atajos, ni foco propio salvo el opcional del resumen. El contenedor
// pone el `<form>`, los avisos y los botones.
export function CamposDelSeguimiento(props: Props) {
  const { id, valores, errores, cambiar, tipos, zona, deshabilitado, original } = props
  const { conVisible = false, conVehiculo = false, enfocarResumen = false } = props
  const parte = { id, valores, errores, cambiar, deshabilitado }
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <CampoSeleccion
          nombre={`${id}-tipo`}
          etiqueta="Tipo de seguimiento"
          opciones={opcionesDeTipo(tipos, original)}
          value={valores.tipoId}
          onChange={(evento) => {
            cambiar('tipoId', evento.target.value)
          }}
          error={errores.tipoId}
          ayuda={tipos.length === 0 ? 'No hay tipos de seguimiento activos.' : undefined}
          disabled={deshabilitado || (tipos.length === 0 && original === null)}
        />
        <CuandoFue
          nombre={`${id}-ocurrido`}
          valor={valores.ocurridoEn}
          alCambiar={(valor) => {
            cambiar('ocurridoEn', valor)
          }}
          error={errores.ocurridoEn}
          deshabilitado={deshabilitado}
          nuevo={original === null}
        />
      </div>
      <Campo
        nombre={`${id}-titulo`}
        etiqueta="Resumen"
        autoComplete="off"
        autoFocus={enfocarResumen}
        maxLength={LARGO_MAXIMO_DEL_TITULO}
        value={valores.titulo}
        onChange={(evento) => {
          cambiar('titulo', evento.target.value)
        }}
        error={errores.titulo}
        disabled={deshabilitado}
      />
      <Detalle {...parte} />
      {conVisible ? <Visible {...parte} /> : null}
      {conVehiculo ? (
        <CampoVehiculo
          nombre={`${id}-vehiculo`}
          valor={valores.vehiculo}
          alCambiar={(valor) => {
            cambiar('vehiculo', valor)
          }}
          actual={original}
          deshabilitado={deshabilitado}
        />
      ) : null}
      {original ? null : (
        <ProximoContacto
          nombre={`${id}-recordatorio`}
          valor={valores.recordatorio}
          alCambiar={(valor) => {
            cambiar('recordatorio', valor)
          }}
          zona={zona}
          error={errores.recordatorio}
          deshabilitado={deshabilitado}
        />
      )}
    </>
  )
}
