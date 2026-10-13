'use client'

import { useId, useState } from 'react'
import { Input } from '../input'
import type { DefFiltro, ValorDeFiltro } from '@/shared/lib/filtros'

type De<Tipo extends DefFiltro['tipo']> = Extract<DefFiltro, { tipo: Tipo }>
type Valor<Tipo extends ValorDeFiltro['tipo']> = Extract<ValorDeFiltro, { tipo: Tipo }>

type Props<Tipo extends DefFiltro['tipo']> = {
  def: De<Tipo>
  valor: Valor<Tipo> | null
  alCambiar: (valor: ValorDeFiltro | null, opciones?: { tipeando?: boolean }) => void
}

// El texto de un campo que también vive en la URL. Mientras la persona escribe manda lo que
// escribe (la URL va detrás, y puede descartar un valor a medio tipear); cuando la URL cambia por
// otro lado (se quitó el chip, se limpiaron los filtros) manda la URL.
function useTextoDeUrl(deLaUrl: string, normalizar: (texto: string) => string) {
  const [texto, setTexto] = useState(deLaUrl)
  const [visto, setVisto] = useState(deLaUrl)
  if (deLaUrl !== visto) {
    setVisto(deLaUrl)
    if (normalizar(texto) !== deLaUrl) {
      setTexto(deLaUrl)
    }
  }
  return [texto, setTexto] as const
}

const LEYENDA = 'mb-1.5 text-(length:--text-sm) font-medium text-(--color-ink)'
const OPCION =
  'flex min-h-11 cursor-pointer items-center gap-2 text-(length:--text-sm) text-(--color-ink) md:min-h-8'

export function FiltroDeOpciones({ def, valor, alCambiar }: Props<'opciones'>) {
  const elegidas = valor?.valores ?? []
  return (
    <fieldset className="grid">
      <legend className={LEYENDA}>{def.etiqueta}</legend>
      <div className="grid max-h-56 overflow-y-auto">
        {def.opciones.map((opcion) => (
          <label key={opcion.valor} className={OPCION}>
            <input
              type="checkbox"
              className="size-4 shrink-0 accent-(--color-primario)"
              checked={elegidas.includes(opcion.valor)}
              onChange={(evento) => {
                const valores = evento.target.checked
                  ? [...elegidas, opcion.valor]
                  : elegidas.filter((otra) => otra !== opcion.valor)
                alCambiar(valores.length === 0 ? null : { tipo: 'opciones', valores })
              }}
            />
            {opcion.color ? (
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: opcion.color }}
              />
            ) : null}
            <span className="min-w-0 truncate">{opcion.etiqueta}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

const SI_O_NO = [
  ['', 'Todos'],
  ['si', 'Sí'],
  ['no', 'No'],
] as const

export function FiltroBooleano({ def, valor, alCambiar }: Props<'booleano'>) {
  const grupo = useId()
  const elegido = valor === null ? '' : valor.valor ? 'si' : 'no'
  return (
    <fieldset>
      <legend className={LEYENDA}>{def.etiqueta}</legend>
      <div className="flex flex-wrap gap-x-4">
        {SI_O_NO.map(([clave, etiqueta]) => (
          <label key={clave} className={OPCION}>
            <input
              type="radio"
              name={grupo}
              className="size-4 accent-(--color-primario)"
              checked={elegido === clave}
              onChange={() => {
                alCambiar(clave === '' ? null : { tipo: 'booleano', valor: clave === 'si' })
              }}
            />
            {etiqueta}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function numeroDe(texto: string): number | null {
  const numero = Number(texto)
  return texto.trim() === '' || !Number.isFinite(numero) ? null : numero
}

const comoNumero = (texto: string) => {
  const numero = numeroDe(texto)
  return numero === null ? '' : String(numero)
}

type PropsDeLimite = {
  id: string
  def: De<'rango_numero'>
  etiqueta: string
  valor: number | null
  alCambiar: (valor: number | null) => void
}

function LimiteNumerico({ id, def, etiqueta, valor, alCambiar }: PropsDeLimite) {
  const [texto, setTexto] = useTextoDeUrl(valor === null ? '' : String(valor), comoNumero)
  return (
    <>
      <label htmlFor={id} className="sr-only">
        {def.etiqueta}, {etiqueta.toLowerCase()}
      </label>
      <Input
        id={id}
        type="number"
        inputMode={def.entero ? 'numeric' : 'decimal'}
        step={def.entero ? 1 : 'any'}
        min={def.minimo}
        max={def.maximo}
        placeholder={etiqueta}
        className="h-11 md:h-9"
        value={texto}
        onChange={(evento) => {
          setTexto(evento.target.value)
          alCambiar(numeroDe(evento.target.value))
        }}
      />
    </>
  )
}

export function FiltroRangoNumero({ def, valor, alCambiar }: Props<'rango_numero'>) {
  const id = useId()
  const min = valor?.min ?? null
  const max = valor?.max ?? null
  function cambiar(nuevoMin: number | null, nuevoMax: number | null) {
    alCambiar(
      nuevoMin === null && nuevoMax === null
        ? null
        : { tipo: 'rango_numero', min: nuevoMin, max: nuevoMax },
      { tipeando: true },
    )
  }
  return (
    <fieldset>
      <legend className={LEYENDA}>{def.etiqueta}</legend>
      <div className="grid grid-cols-2 gap-2">
        <LimiteNumerico
          id={`${id}-min`}
          def={def}
          etiqueta="Desde"
          valor={min}
          alCambiar={(nuevo) => {
            cambiar(nuevo, max)
          }}
        />
        <LimiteNumerico
          id={`${id}-max`}
          def={def}
          etiqueta="Hasta"
          valor={max}
          alCambiar={(nuevo) => {
            cambiar(min, nuevo)
          }}
        />
      </div>
    </fieldset>
  )
}

export function FiltroRangoFecha({ def, valor, alCambiar }: Props<'rango_fecha'>) {
  const id = useId()
  const desde = valor?.desde ?? null
  const hasta = valor?.hasta ?? null
  function cambiar(nuevoDesde: string | null, nuevoHasta: string | null) {
    alCambiar(
      nuevoDesde === null && nuevoHasta === null
        ? null
        : { tipo: 'rango_fecha', desde: nuevoDesde, hasta: nuevoHasta },
    )
  }
  return (
    <fieldset>
      <legend className={LEYENDA}>{def.etiqueta}</legend>
      <div className="grid grid-cols-2 gap-2">
        <label htmlFor={`${id}-desde`} className="sr-only">
          {def.etiqueta}, desde
        </label>
        <Input
          id={`${id}-desde`}
          type="date"
          className="h-11 md:h-9"
          value={desde ?? ''}
          onChange={(evento) => {
            cambiar(evento.target.value === '' ? null : evento.target.value, hasta)
          }}
        />
        <label htmlFor={`${id}-hasta`} className="sr-only">
          {def.etiqueta}, hasta
        </label>
        <Input
          id={`${id}-hasta`}
          type="date"
          className="h-11 md:h-9"
          value={hasta ?? ''}
          onChange={(evento) => {
            cambiar(desde, evento.target.value === '' ? null : evento.target.value)
          }}
        />
      </div>
    </fieldset>
  )
}

const recortado = (texto: string) => texto.trim()

export function FiltroDeTexto({ def, valor, alCambiar }: Props<'texto'>) {
  const id = useId()
  const [texto, setTexto] = useTextoDeUrl(valor?.texto ?? '', recortado)
  return (
    <div className="grid">
      <label htmlFor={id} className={LEYENDA}>
        {def.etiqueta}
      </label>
      <Input
        id={id}
        type="search"
        autoComplete="off"
        placeholder="Contiene…"
        className="h-11 md:h-9"
        value={texto}
        onChange={(evento) => {
          setTexto(evento.target.value)
          const escrito = evento.target.value.trim()
          alCambiar(escrito === '' ? null : { tipo: 'texto', texto: escrito }, { tipeando: true })
        }}
      />
    </div>
  )
}

// La búsqueda libre de la barra del listado.
export function CampoDeBusqueda(props: {
  etiqueta: string
  valor: string
  alBuscar: (texto: string) => void
}) {
  const id = useId()
  const [texto, setTexto] = useTextoDeUrl(props.valor, recortado)
  return (
    <div className="min-w-0 flex-1 basis-56 md:max-w-sm">
      <label htmlFor={id} className="sr-only">
        {props.etiqueta}
      </label>
      <Input
        id={id}
        type="search"
        autoComplete="off"
        placeholder={props.etiqueta}
        className="h-11 md:h-9"
        value={texto}
        onChange={(evento) => {
          setTexto(evento.target.value)
          props.alBuscar(evento.target.value.trim())
        }}
      />
    </div>
  )
}
