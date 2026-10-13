'use client'

import { Campo } from '@/shared/ui/campo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import type { OpcionDeCampo, TipoDeCampo, ValorDefecto } from '../../../entities/campo'
import { LARGO_MAXIMO_DE_VALOR_DEFECTO, admiteValorDefecto } from '../../../entities/valor-defecto'

type Props = {
  tipo: TipoDeCampo
  opciones: readonly OpcionDeCampo[]
  valor: ValorDefecto | null
  alCambiar: (valor: ValorDefecto | null) => void
  error?: string
  deshabilitado: boolean
}

const NOMBRE = 'valorDefecto'
const ETIQUETA = 'Valor por defecto'
const AYUDA = 'Lo que trae puesto el formulario al dar de alta. Quien carga lo puede cambiar.'
const SIN_VALOR = { valor: '', etiqueta: 'Sin valor por defecto' }
const SI_O_NO = [SIN_VALOR, { valor: 'si', etiqueta: 'Sí' }, { valor: 'no', etiqueta: 'No' }]

function DeSiONo({ valor, alCambiar, error, deshabilitado }: Props) {
  const elegido = typeof valor === 'boolean' ? (valor ? 'si' : 'no') : ''
  return (
    <CampoSeleccion
      nombre={NOMBRE}
      etiqueta={ETIQUETA}
      opciones={SI_O_NO}
      value={elegido}
      onChange={(evento) => {
        alCambiar(evento.target.value === '' ? null : evento.target.value === 'si')
      }}
      ayuda={AYUDA}
      error={error}
      disabled={deshabilitado}
    />
  )
}

function DeUnaOpcion({ opciones, valor, alCambiar, error, deshabilitado }: Props) {
  return (
    <CampoSeleccion
      nombre={NOMBRE}
      etiqueta={ETIQUETA}
      opciones={[SIN_VALOR, ...opciones.map((o) => ({ valor: o.clave, etiqueta: o.etiqueta }))]}
      value={typeof valor === 'string' ? valor : ''}
      onChange={(evento) => {
        alCambiar(evento.target.value === '' ? null : evento.target.value)
      }}
      ayuda={AYUDA}
      error={error}
      disabled={deshabilitado}
    />
  )
}

function DeVariasOpciones({ opciones, valor, alCambiar, error, deshabilitado }: Props) {
  const elegidas = Array.isArray(valor) ? valor : []
  function alternar(clave: string, marcada: boolean) {
    const siguientes = marcada ? [...elegidas, clave] : elegidas.filter((otra) => otra !== clave)
    alCambiar(siguientes.length > 0 ? siguientes : null)
  }
  return (
    <fieldset className="grid gap-1.5" disabled={deshabilitado}>
      <legend className="text-(length:--text-sm) font-medium text-(--color-ink)">{ETIQUETA}</legend>
      {opciones.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-faint)">
          Agrega opciones para poder elegir cuáles vienen marcadas.
        </p>
      ) : (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {opciones.map((opcion) => (
            <label
              key={opcion.clave}
              className="flex min-h-11 items-center gap-2 text-(length:--text-sm) text-(--color-ink) md:min-h-8"
            >
              <input
                type="checkbox"
                className="size-4 accent-(--color-primario)"
                checked={elegidas.includes(opcion.clave)}
                onChange={(evento) => {
                  alternar(opcion.clave, evento.target.checked)
                }}
              />
              {opcion.etiqueta}
            </label>
          ))}
        </div>
      )}
      <p
        className={
          error
            ? 'text-(length:--text-sm) text-(--color-peligro-ink)'
            : 'text-(length:--text-sm) text-(--color-ink-faint)'
        }
      >
        {error ?? AYUDA}
      </p>
    </fieldset>
  )
}

function DeNumero({ valor, alCambiar, error, deshabilitado }: Props) {
  return (
    <Campo
      nombre={NOMBRE}
      etiqueta={ETIQUETA}
      type="number"
      inputMode="decimal"
      step="any"
      autoComplete="off"
      value={typeof valor === 'number' ? valor : ''}
      onChange={(evento) => {
        const numero = evento.target.valueAsNumber
        alCambiar(Number.isFinite(numero) ? numero : null)
      }}
      ayuda={AYUDA}
      error={error}
      disabled={deshabilitado}
    />
  )
}

function DeTexto({ valor, alCambiar, error, deshabilitado }: Props) {
  return (
    <Campo
      nombre={NOMBRE}
      etiqueta={ETIQUETA}
      autoComplete="off"
      maxLength={LARGO_MAXIMO_DE_VALOR_DEFECTO}
      value={typeof valor === 'string' ? valor : ''}
      onChange={(evento) => {
        alCambiar(evento.target.value === '' ? null : evento.target.value)
      }}
      ayuda={AYUDA}
      error={error}
      disabled={deshabilitado}
    />
  )
}

// El control que le toca a cada tipo. Los que no están no llevan valor por defecto.
const CONTROL: Partial<Record<TipoDeCampo, (props: Props) => React.JSX.Element>> = {
  texto: DeTexto,
  texto_largo: DeTexto,
  numero: DeNumero,
  moneda: DeNumero,
  booleano: DeSiONo,
  opcion: DeUnaOpcion,
  multi_opcion: DeVariasOpciones,
}

// El valor por defecto de un campo. Los tipos donde un valor fijo no tiene sentido (fecha,
// enlace, VIN, lote) no lo muestran.
export function CampoValorDefecto(props: Props) {
  const Control = admiteValorDefecto(props.tipo) ? CONTROL[props.tipo] : undefined
  return Control ? <Control {...props} /> : null
}
