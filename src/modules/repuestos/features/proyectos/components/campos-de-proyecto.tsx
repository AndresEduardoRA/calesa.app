'use client'

import type { ReactNode } from 'react'
import { Campo } from '@/shared/ui/campo'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import type { OrigenDelProyecto } from '../../../entities/proyectos/borrador'
import type { EstadoDelFormulario } from '../hooks/use-formulario-de-proyecto'

// Lo que recibe el buscador que arma `src/app`: `repuestos` no importa `buscador` (8.09-1, C10).
export type PropsDeBuscadorDeProyecto = {
  valor: { id: string; titulo: string } | null
  alElegir: (elegido: { id: string; titulo: string } | null) => void
  etiqueta: string
  error?: string
  disabled?: boolean
}

export type BuscadorDeProyecto = (props: PropsDeBuscadorDeProyecto) => ReactNode

type Props = {
  valores: EstadoDelFormulario
  errores: Record<string, string>
  disabled: boolean
  // «Lead» sólo con `leads.ver`: sin ella el bloque no se dibuja (D44).
  puedeVerLeads: boolean
  avisoDelVehiculo: string | null
  escribir: (cambios: Partial<EstadoDelFormulario>) => void
  buscadorDeVehiculo: BuscadorDeProyecto
  buscadorDeLead: BuscadorDeProyecto
}

const ORIGENES: readonly { valor: OrigenDelProyecto; etiqueta: string }[] = [
  { valor: 'vehiculo', etiqueta: 'De un vehículo' },
  { valor: 'externo', etiqueta: 'Externo' },
]

function Origen({
  valor,
  disabled,
  alElegir,
}: {
  valor: OrigenDelProyecto
  disabled: boolean
  alElegir: (o: OrigenDelProyecto) => void
}) {
  return (
    <fieldset className="grid gap-1.5" disabled={disabled}>
      <legend className="text-(length:--text-sm) font-medium text-(--color-ink)">
        Origen del proyecto
      </legend>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {ORIGENES.map((origen) => (
          <label key={origen.valor} className="flex min-h-11 items-center gap-2 md:min-h-9">
            <input
              type="radio"
              name="origen"
              value={origen.valor}
              checked={valor === origen.valor}
              onChange={() => {
                alElegir(origen.valor)
              }}
            />
            {origen.etiqueta}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

type Parte = Props

function CamposDeUnVehiculo({ valores, errores, disabled, escribir, buscadorDeVehiculo }: Parte) {
  return buscadorDeVehiculo({
    valor:
      valores.vehiculoId === '' ? null : { id: valores.vehiculoId, titulo: valores.vehiculoTitulo },
    alElegir: (elegido) => {
      escribir({ vehiculoId: elegido?.id ?? '', vehiculoTitulo: elegido?.titulo ?? '' })
    },
    etiqueta: 'Vehículo',
    error: errores['vehiculoId'],
    disabled,
  })
}

type Texto = 'vehiculoEtiqueta' | 'vin' | 'clienteNombre' | 'clienteTelefono'
const TEXTOS: readonly { campo: Texto; etiqueta: string; tel?: true }[] = [
  { campo: 'vehiculoEtiqueta', etiqueta: 'Vehículo' },
  { campo: 'vin', etiqueta: 'VIN (opcional)' },
  { campo: 'clienteNombre', etiqueta: 'Cliente (opcional)' },
  { campo: 'clienteTelefono', etiqueta: 'Teléfono del cliente (opcional)', tel: true },
]

function CamposExternos({ valores, errores, disabled, escribir, ...p }: Parte) {
  return (
    <>
      {TEXTOS.map(({ campo, etiqueta, tel }) => (
        <Campo
          key={campo}
          nombre={campo}
          etiqueta={etiqueta}
          type={tel ? 'tel' : undefined}
          value={valores[campo]}
          error={errores[campo]}
          disabled={disabled}
          onChange={(e) => {
            escribir({ [campo]: e.target.value })
          }}
        />
      ))}
      {p.puedeVerLeads
        ? p.buscadorDeLead({
            valor:
              valores.leadId === '' ? null : { id: valores.leadId, titulo: valores.leadTitulo },
            alElegir: (elegido) => {
              escribir({ leadId: elegido?.id ?? '', leadTitulo: elegido?.titulo ?? '' })
            },
            etiqueta: 'Lead (opcional)',
            error: errores['leadId'],
            disabled,
          })
        : null}
    </>
  )
}

function Notas({
  valor,
  error,
  disabled,
  alEscribir,
}: {
  valor: string
  error?: string
  disabled: boolean
  alEscribir: (texto: string) => void
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor="notas">Notas (opcional)</Label>
      <Textarea
        id="notas"
        name="notas"
        value={valor}
        aria-invalid={error ? true : undefined}
        disabled={disabled}
        onChange={(e) => {
          alEscribir(e.target.value)
        }}
      />
      {error ? <p className="text-(length:--text-sm) text-(--color-peligro-ink)">{error}</p> : null}
    </div>
  )
}

// Los campos de «Nuevo proyecto» (8.09-1, C9). De un vehículo: sólo el buscador (sus datos salen del vehículo). Externo: la etiqueta, el VIN, el cliente (texto libre) y, con `leads.ver`, el lead.
// Las notas van en los dos.
export function CamposDeProyecto(p: Props) {
  const { valores, errores, disabled, escribir } = p
  return (
    <>
      <Origen
        valor={valores.origen}
        disabled={disabled}
        alElegir={(origen) => {
          escribir({ origen })
        }}
      />
      {p.avisoDelVehiculo ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{p.avisoDelVehiculo}</p>
      ) : null}
      {valores.origen === 'vehiculo' ? <CamposDeUnVehiculo {...p} /> : <CamposExternos {...p} />}
      <Notas
        valor={valores.notas}
        error={errores['notas']}
        disabled={disabled}
        alEscribir={(notas) => {
          escribir({ notas })
        }}
      />
    </>
  )
}
