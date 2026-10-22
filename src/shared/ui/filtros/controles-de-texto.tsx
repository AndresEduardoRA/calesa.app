'use client'

import { useEffect, useId, useRef } from 'react'
import { Input } from '../input'
import { LEYENDA } from './estilos'
import { useTextoDeUrl } from './use-texto-de-url'
import {
  cumpleElMinimo,
  type DefFiltro,
  type MinimoDeBusqueda,
  type ValorDeFiltro,
} from '@/shared/lib/filtros'

type Props<Tipo extends DefFiltro['tipo']> = {
  def: Extract<DefFiltro, { tipo: Tipo }>
  valor: Extract<ValorDeFiltro, { tipo: Tipo }> | null
  alCambiar: (valor: ValorDeFiltro | null, opciones?: { tipeando?: boolean }) => void
}

// Los controles de texto de un listado: el de un campo del layout y la búsqueda libre de la barra. Los dos pueden pedir un mínimo para filtrar (`MinimoDeBusqueda`).
const recortado = (texto: string) => texto.trim()

// El texto de un campo. Con `def.minimo` (4.03, 5a-9), lo escrito que no alcanza no se manda a la URL ni al servidor: se queda en el campo con la línea de `minimo.aviso`
// debajo y la URL queda sin esa clave, como la búsqueda de la barra (5a-8). Sin `minimo` (vehículos) avisa cada cambio, como siempre.
export function FiltroDeTexto({ def, valor, alCambiar }: Props<'texto'>) {
  const id = useId()
  const idDelAviso = useId()
  const { minimo } = def
  // Lo que cuenta como filtro: lo escrito si alcanza; si no, nada.
  const buscable = (texto: string) =>
    minimo && !cumpleElMinimo(texto, minimo) ? '' : recortado(texto)
  const [texto, setTexto] = useTextoDeUrl(valor?.texto ?? '', buscable)
  const insuficiente = minimo !== undefined && recortado(texto) !== '' && buscable(texto) === ''
  // Lo último que se pidió: con el mínimo, una tecla que sigue sin alcanzar no vuelve a escribir un «nada» sobre una URL que ya no tiene la clave (una vuelta al servidor para nada).
  const ultimo = useRef(valor?.texto ?? '')
  useEffect(() => {
    ultimo.current = valor?.texto ?? ''
  }, [valor?.texto])
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
        aria-describedby={insuficiente ? idDelAviso : undefined}
        className="h-11 md:h-9"
        value={texto}
        onChange={(evento) => {
          setTexto(evento.target.value)
          const escrito = buscable(evento.target.value)
          if (minimo) {
            if (escrito === ultimo.current) {
              return
            }
            ultimo.current = escrito
          }
          alCambiar(escrito === '' ? null : { tipo: 'texto', texto: escrito }, { tipeando: true })
        }}
      />
      {insuficiente ? (
        <p
          id={idDelAviso}
          role="status"
          data-aviso-de-filtro
          className="mt-1 text-xs text-(--color-ink-soft)"
        >
          {minimo.aviso}
        </p>
      ) : null}
    </div>
  )
}

// La búsqueda libre de la barra del listado. Con `minimo` (5a-8), lo escrito que no alcanza no se manda a la URL (ni al servidor): se queda en el campo,
// con la línea de `minimo.aviso` al final de la barra, y la URL queda sin `?q=` (el campo no la lee como «quitaron el filtro» y no se vacía).
export function CampoDeBusqueda(props: {
  etiqueta: string
  // Lo que se ve en el campo vacío si es más corto que la etiqueta (la etiqueta queda para el lector de pantalla).
  marcador?: string | undefined
  minimo?: MinimoDeBusqueda | undefined
  valor: string
  alBuscar: (texto: string) => void
}) {
  const id = useId()
  const idDelAviso = useId()
  const { minimo } = props
  // Lo que cuenta como búsqueda: lo escrito si alcanza; si no, nada.
  const buscable = (texto: string) =>
    minimo && !cumpleElMinimo(texto, minimo) ? '' : recortado(texto)
  const [texto, setTexto] = useTextoDeUrl(props.valor, buscable)
  const insuficiente = minimo !== undefined && recortado(texto) !== '' && buscable(texto) === ''
  return (
    <>
      <div className="min-w-0 flex-1 basis-56 md:max-w-sm">
        <label htmlFor={id} className="sr-only">
          {props.etiqueta}
        </label>
        <Input
          id={id}
          type="search"
          autoComplete="off"
          placeholder={props.marcador ?? props.etiqueta}
          aria-describedby={insuficiente ? idDelAviso : undefined}
          className="h-11 md:h-9"
          value={texto}
          onChange={(evento) => {
            setTexto(evento.target.value)
            props.alBuscar(buscable(evento.target.value))
          }}
        />
      </div>
      {/* Una fila entera al final de la barra: no mueve los botones mientras se escribe y, al 200 %, cabe en una sola línea. */}
      {insuficiente ? (
        <p
          id={idDelAviso}
          role="status"
          data-aviso-de-busqueda
          className="order-last basis-full text-xs text-(--color-ink-soft)"
        >
          {minimo.aviso}
        </p>
      ) : null}
    </>
  )
}
