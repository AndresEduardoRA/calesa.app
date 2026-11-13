'use client'

import {
  MOTIVO_DE_NOTA_OBLIGATORIA,
  textoDelBoton,
  type DestinoConVista,
} from '@/modules/flujos/client'
import { atajoDe } from '@/shared/lib/atajos'
import { unidadDeLogistica } from '@/shared/lib/rutas'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import type { UnidadAbierta } from '../../../entities/nucleo/unidad'
import type { BorradorDeMover } from '../hooks/use-borrador-de-mover'
import { useMoverLaUnidad } from '../hooks/use-mover-la-unidad'

type Props = {
  unidad: UnidadAbierta
  destino: DestinoConVista
  puedeMover: boolean
  borrador: BorradorDeMover
  releer: () => void
}

// La nota interna del cambio: obligatoria si la fase o la salida la piden (dicho junto al campo, no sólo en el botón). Ctrl/Cmd+Enter envía.
function CampoDeNota(props: {
  faseId: string
  pideNota: boolean
  nota: string
  alEscribir: (texto: string) => void
  alEnviar: () => void
}) {
  const { faseId, pideNota, nota, alEscribir, alEnviar } = props
  const idNota = `nota-de-mover-${faseId}`
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={idNota}>
        {pideNota ? 'Nota interna (obligatoria)' : 'Nota interna (opcional)'}
      </Label>
      <Textarea
        id={idNota}
        name="nota"
        value={nota}
        aria-describedby={pideNota ? `${idNota}-ayuda` : undefined}
        onChange={(evento) => {
          alEscribir(evento.target.value)
        }}
        onKeyDown={(evento) => {
          if (atajoDe(evento.nativeEvent) === 'guardarYSeguir') {
            evento.preventDefault()
            alEnviar()
          }
        }}
      />
      {pideNota ? (
        <p id={`${idNota}-ayuda`} className="text-(length:--text-sm) text-(--color-ink-soft)">
          {MOTIVO_DE_NOTA_OBLIGATORIA}
        </p>
      ) : null}
    </div>
  )
}

// El formulario de mover a un destino, en el mismo bloque (sin modal): la nota interna (obligatoria si la fase o la salida la piden, dicho junto al campo), el botón y, si está apagado, el motivo
// escrito debajo. Ctrl/Cmd+Enter en la nota envía cuando el botón está habilitado. Un conflicto se pinta aquí adentro, con el nombre de quien movió antes.
export function FormularioDeMover({ unidad, destino, puedeMover, borrador, releer }: Props) {
  const { estado, enCurso, rechazo, fallo, enviar, recargar } = useMoverLaUnidad({
    unidad,
    destino,
    puedeMover,
    borrador,
    releer,
  })
  const pideNota = destino.vista?.notaObligatoria ?? false
  const idMotivo = `motivo-de-mover-${destino.faseId}`
  return (
    <form
      className="grid gap-3"
      aria-busy={enCurso}
      data-formulario="mover"
      onSubmit={(evento) => {
        evento.preventDefault()
        void enviar()
      }}
    >
      <CampoDeNota
        faseId={destino.faseId}
        pideNota={pideNota}
        nota={borrador.nota}
        alEscribir={borrador.escribir}
        alEnviar={() => {
          void enviar()
        }}
      />
      {borrador.conflicto ? (
        <AvisoDeConflicto
          mensaje={borrador.conflicto.mensaje}
          hrefVer={unidadDeLogistica(unidad.id)}
          alRecargar={recargar}
          detalle="No se movió nada. Recargar trae su estado y conserva tu nota."
        />
      ) : null}
      {rechazo ? (
        <Aviso tono="aviso">
          <p>{rechazo}</p>
        </Aviso>
      ) : null}
      {fallo ? (
        <Aviso tono="peligro">
          <p>{fallo}</p>
        </Aviso>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="submit"
          className="min-h-11 md:min-h-9"
          disabled={!estado.habilitado || enCurso}
          aria-describedby={estado.habilitado ? undefined : idMotivo}
        >
          {textoDelBoton(destino, unidad.faseId === null)}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="min-h-11 md:min-h-9"
          onClick={borrador.cerrar}
          disabled={enCurso}
        >
          Cancelar
        </Button>
      </div>
      {estado.habilitado ? null : (
        <p
          id={idMotivo}
          data-motivo-del-boton
          className="text-(length:--text-sm) text-(--color-ink-soft)"
        >
          {estado.motivo}
        </p>
      )}
    </form>
  )
}
