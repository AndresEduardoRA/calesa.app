'use client'

import { cn } from 'cn'
import { Campo } from '@/shared/ui/campo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import type { CampoDeFormulario, Control, ValorDeFormulario } from '@/shared/lib/campos'

type Props = {
  campo: CampoDeFormulario
  valor: ValorDeFormulario | undefined
  error: string | undefined
  alCambiar: (valor: ValorDeFormulario) => void
  deshabilitado: boolean
  enfocar?: boolean
}

type PropsDe<Tipo extends Control['tipo']> = Omit<Props, 'campo'> & {
  campo: CampoDeFormulario
  control: Extract<Control, { tipo: Tipo }>
}

const comoTexto = (valor: ValorDeFormulario | undefined) => (typeof valor === 'string' ? valor : '')

// Un requerido lo dice en la etiqueta, no sólo con un asterisco.
const etiquetaDe = (campo: CampoDeFormulario) =>
  campo.requerido ? `${campo.etiqueta} (obligatorio)` : campo.etiqueta

const MOTIVO = 'text-(length:--text-sm) text-(--color-peligro-ink)'
const AYUDA = 'text-(length:--text-sm) text-(--color-ink-faint)'

function DeTexto({
  campo,
  control,
  valor,
  error,
  alCambiar,
  deshabilitado,
  enfocar,
}: PropsDe<'texto'>) {
  return (
    <Campo
      nombre={campo.clave}
      etiqueta={etiquetaDe(campo)}
      type={control.modo ?? 'text'}
      inputMode={control.modo === 'url' || control.modo === 'email' ? control.modo : undefined}
      autoComplete="off"
      autoCapitalize={control.mayusculas ? 'characters' : undefined}
      spellCheck={control.mayusculas ? false : undefined}
      maxLength={control.largo}
      className={cn('h-11 md:h-9', control.mayusculas && 'uppercase')}
      value={comoTexto(valor)}
      onChange={(evento) => {
        alCambiar(evento.target.value)
      }}
      error={error}
      disabled={deshabilitado}
      autoFocus={enfocar}
    />
  )
}

function DeNumero({ campo, control, valor, error, alCambiar, deshabilitado }: PropsDe<'numero'>) {
  return (
    <Campo
      nombre={campo.clave}
      etiqueta={control.unidad ? `${etiquetaDe(campo)} (${control.unidad})` : etiquetaDe(campo)}
      // Texto y no `number`: así se puede escribir la coma decimal y nada se redondea solo.
      type="text"
      inputMode={control.entero ? 'numeric' : 'decimal'}
      autoComplete="off"
      className="h-11 tabular-nums md:h-9"
      value={comoTexto(valor)}
      onChange={(evento) => {
        alCambiar(evento.target.value)
      }}
      error={error}
      disabled={deshabilitado}
    />
  )
}

function DeFecha(props: PropsDe<'fecha'> | PropsDe<'fecha_hora'>) {
  const { campo, control, valor, error, alCambiar, deshabilitado } = props
  return (
    <Campo
      nombre={campo.clave}
      etiqueta={etiquetaDe(campo)}
      type={control.tipo === 'fecha' ? 'date' : 'datetime-local'}
      value={comoTexto(valor)}
      onChange={(evento) => {
        alCambiar(evento.target.value)
      }}
      error={error}
      disabled={deshabilitado}
    />
  )
}

function DeTextoLargo({ campo, valor, error, alCambiar, deshabilitado }: PropsDe<'texto_largo'>) {
  const idError = error ? `${campo.clave}-error` : undefined
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={campo.clave}>{etiquetaDe(campo)}</Label>
      <Textarea
        id={campo.clave}
        name={campo.clave}
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={idError}
        value={comoTexto(valor)}
        onChange={(evento) => {
          alCambiar(evento.target.value)
        }}
        disabled={deshabilitado}
      />
      {error ? (
        <p id={idError} className={MOTIVO}>
          {error}
        </p>
      ) : null}
    </div>
  )
}

const SI_O_NO = [
  { valor: '', etiqueta: 'Sin dato' },
  { valor: 'si', etiqueta: 'Sí' },
  { valor: 'no', etiqueta: 'No' },
]

function DeSiONo({ campo, valor, error, alCambiar, deshabilitado }: PropsDe<'si_no'>) {
  const elegido = typeof valor === 'boolean' ? (valor ? 'si' : 'no') : ''
  return (
    <CampoSeleccion
      nombre={campo.clave}
      etiqueta={etiquetaDe(campo)}
      opciones={SI_O_NO}
      value={elegido}
      onChange={(evento) => {
        alCambiar(evento.target.value === '' ? null : evento.target.value === 'si')
      }}
      error={error}
      disabled={deshabilitado}
    />
  )
}

function DeOpcion({ campo, control, valor, error, alCambiar, deshabilitado }: PropsDe<'opcion'>) {
  const sinOpciones = control.opciones.length === 0
  return (
    <CampoSeleccion
      nombre={campo.clave}
      etiqueta={etiquetaDe(campo)}
      opciones={[{ valor: '', etiqueta: 'Sin elegir' }, ...control.opciones]}
      value={comoTexto(valor)}
      onChange={(evento) => {
        alCambiar(evento.target.value)
      }}
      error={error}
      ayuda={sinOpciones ? 'Este campo todavía no tiene opciones para elegir.' : undefined}
      disabled={deshabilitado || sinOpciones}
    />
  )
}

function DeVarias({ campo, control, valor, error, alCambiar, deshabilitado }: PropsDe<'varias'>) {
  const elegidas = Array.isArray(valor) ? valor : []
  const idError = error ? `${campo.clave}-error` : undefined
  return (
    <fieldset className="grid gap-1.5" disabled={deshabilitado} aria-describedby={idError}>
      <legend className="mb-1.5 text-(length:--text-sm) font-medium text-(--color-ink)">
        {etiquetaDe(campo)}
      </legend>
      {control.opciones.length === 0 ? (
        <p className={AYUDA}>Este campo todavía no tiene opciones para elegir.</p>
      ) : (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {control.opciones.map((opcion, indice) => (
            <label
              key={opcion.valor}
              className="flex min-h-11 items-center gap-2 text-(length:--text-sm) text-(--color-ink) md:min-h-8"
            >
              <input
                type="checkbox"
                // El primero lleva el nombre del campo: ahí va el foco si el grupo tiene un error.
                name={indice === 0 ? campo.clave : undefined}
                aria-invalid={error && indice === 0 ? true : undefined}
                className="size-4 accent-(--color-primario)"
                checked={elegidas.includes(opcion.valor)}
                onChange={(evento) => {
                  alCambiar(
                    evento.target.checked
                      ? [...elegidas, opcion.valor]
                      : elegidas.filter((otra) => otra !== opcion.valor),
                  )
                }}
              />
              {opcion.etiqueta}
            </label>
          ))}
        </div>
      )}
      {error ? (
        <p id={idError} className={MOTIVO}>
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}

// Un dato de un formulario de campos, con el control que le toca. Sirve igual para un dato propio
// del módulo y para un campo del layout: la etiqueta ya viene resuelta.
export function CampoDeFormulario(props: Props) {
  const { control } = props.campo
  switch (control.tipo) {
    case 'texto':
      return <DeTexto {...props} control={control} />
    case 'texto_largo':
      return <DeTextoLargo {...props} control={control} />
    case 'numero':
      return <DeNumero {...props} control={control} />
    case 'si_no':
      return <DeSiONo {...props} control={control} />
    case 'opcion':
      return <DeOpcion {...props} control={control} />
    case 'varias':
      return <DeVarias {...props} control={control} />
    case 'fecha':
      return <DeFecha {...props} control={control} />
    case 'fecha_hora':
      return <DeFecha {...props} control={control} />
  }
}
