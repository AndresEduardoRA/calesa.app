'use client'

import { useId } from 'react'
import { Campo } from '@/shared/ui/campo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { Label } from '@/shared/ui/label'
import { useRegional } from '@/shared/ui/regional'
import { Textarea } from '@/shared/ui/textarea'
import type { Embudo } from '../../../entities/embudo'
import {
  LARGO_MAXIMO_DE_NOTAS,
  LARGO_MAXIMO_DE_TITULO,
  type Oportunidad,
} from '../../../entities/oportunidad'
import { CampoVehiculo } from '../../recordatorios/components/campo-vehiculo'
import type { useFormularioDeOportunidad } from '../hooks/use-formulario-de-oportunidad'

type Props = {
  formulario: ReturnType<typeof useFormularioDeOportunidad>
  oportunidad: Oportunidad | null
  // Al crear y con más de uno, en cuál (sin elegir, el de por defecto).
  embudos: readonly Embudo[]
}

// Los campos de una oportunidad: título, monto (en la moneda de la empresa, sin convertir), notas,
// vehículo (uno del lead que quien escribe ve) y, al crear, el embudo.
export function CamposDeOportunidad({ formulario: f, oportunidad, embudos }: Props) {
  const id = useId()
  const { monedaBase } = useRegional()
  const moneda = oportunidad?.moneda ?? monedaBase
  return (
    <div className="grid gap-4">
      <Campo
        nombre="titulo"
        etiqueta="Título"
        value={f.valores.titulo}
        maxLength={LARGO_MAXIMO_DE_TITULO + 20}
        error={f.errores.titulo}
        onChange={(evento) => {
          f.cambiar('titulo', evento.target.value)
        }}
      />
      <Campo
        nombre="monto_estimado"
        etiqueta={`Monto estimado (${moneda}, opcional)`}
        inputMode="decimal"
        value={f.valores.monto}
        error={f.errores.monto_estimado}
        onChange={(evento) => {
          f.cambiar('monto', evento.target.value)
        }}
      />
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-notas`}>Notas (opcional)</Label>
        <Textarea
          id={`${id}-notas`}
          value={f.valores.notas}
          rows={3}
          maxLength={LARGO_MAXIMO_DE_NOTAS + 20}
          aria-invalid={f.errores.notas ? true : undefined}
          aria-describedby={f.errores.notas ? `${id}-notas-error` : undefined}
          onChange={(evento) => {
            f.cambiar('notas', evento.target.value)
          }}
        />
        {f.errores.notas ? (
          <p
            id={`${id}-notas-error`}
            className="text-(length:--text-sm) text-(--color-peligro-ink)"
          >
            {f.errores.notas}
          </p>
        ) : null}
      </div>
      <CampoVehiculo
        nombre="vehiculo"
        valor={f.valores.vehiculo}
        actual={oportunidad}
        error={f.errores.vehiculo}
        alCambiar={(valor) => {
          f.cambiar('vehiculo', valor)
        }}
      />
      {!oportunidad && embudos.length > 1 ? (
        <CampoSeleccion
          nombre="embudo"
          etiqueta="Embudo"
          opciones={[
            {
              valor: '',
              etiqueta: `${embudos.find((e) => e.esDefault)?.nombre ?? 'El de siempre'} (por defecto)`,
            },
            ...embudos
              .filter((e) => !e.esDefault)
              .map((e) => ({ valor: e.id, etiqueta: e.nombre })),
          ]}
          value={f.embudo}
          onChange={(evento) => {
            f.setEmbudo(evento.target.value)
          }}
        />
      ) : null}
    </div>
  )
}
