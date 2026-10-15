'use client'

import { useId } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import { useAtajo } from '@/shared/ui/atajos'
import { LARGO_MAXIMO_DEL_RECORDATORIO, type Recordatorio } from '../../../entities/recordatorios'
import type { ResultadoDeRecordatorio } from '../../../entities/repositorios'
import { useFormularioDeRecordatorio } from '../hooks/use-formulario-de-recordatorio'
import { CampoCuando } from './campo-cuando'
import { CampoVehiculo } from './campo-vehiculo'

type Props = {
  leadId: string
  zona: string
  original: Recordatorio | null
  alGuardar: (recordatorio: ResultadoDeRecordatorio['recordatorio']) => void
  alCerrar: () => void
}

// Agendar o cambiar un recordatorio, en línea: de qué es y cuándo (con los atajos de fecha).
// `Ctrl/Cmd+Enter` o `Ctrl/Cmd+S` guarda; `Esc` cierra.
export function FormularioDeRecordatorio({ leadId, zona, original, alGuardar, alCerrar }: Props) {
  const id = useId()
  const formulario = useFormularioDeRecordatorio({ leadId, zona, original, alGuardar })
  useAtajo('cerrar', alCerrar)
  return (
    <form
      aria-label={original ? 'Editar recordatorio' : 'Agendar recordatorio'}
      className="grid min-w-0 gap-3 rounded-(--radius-lg) border border-(--color-line) bg-(--color-surface) p-3"
      onSubmit={(evento) => {
        evento.preventDefault()
        void formulario.enviar()
      }}
    >
      {formulario.aviso ? <Aviso tono="peligro">{formulario.aviso}</Aviso> : null}
      <Campo
        nombre={`${id}-titulo`}
        etiqueta="De qué es"
        autoComplete="off"
        autoFocus
        maxLength={LARGO_MAXIMO_DEL_RECORDATORIO}
        value={formulario.titulo}
        onChange={(evento) => {
          formulario.cambiarTitulo(evento.target.value)
        }}
        error={formulario.errores.titulo}
        disabled={formulario.enCurso}
      />
      <CampoCuando
        nombre={`${id}-cuando`}
        etiqueta="Cuándo"
        valor={formulario.cuando}
        alCambiar={formulario.cambiarCuando}
        zona={zona}
        error={formulario.errores.recordarEn}
        deshabilitado={formulario.enCurso}
      />
      <CampoVehiculo
        nombre={`${id}-vehiculo`}
        valor={formulario.vehiculo}
        alCambiar={formulario.cambiarVehiculo}
        actual={original}
        deshabilitado={formulario.enCurso}
      />
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          className="min-h-11 md:min-h-9"
          onClick={alCerrar}
          disabled={formulario.enCurso}
        >
          Cancelar
        </Button>
        <Button type="submit" className="min-h-11 md:min-h-9" disabled={formulario.enCurso}>
          {formulario.enCurso ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </form>
  )
}
