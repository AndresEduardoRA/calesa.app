'use client'

import { useRef, useState, useSyncExternalStore } from 'react'
import { cn } from 'cn'
import { Button } from '../button'
import { usePorPaginaDelListado, type PorPaginaDelListado } from './use-por-pagina-del-listado'

const sinSuscripcion = () => () => undefined

const FLECHAS = new Set(['ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'])

type Props = {
  opciones: readonly number[]
  estado: PorPaginaDelListado
  className?: string
}

export type PorPaginaDeLaLista = { valor: number; opciones: readonly number[] }

// El selector de un listado, con su estado: nada si el listado no lo ofrece. Va una vez en `FilterShell`: en la barra desde
// `md` y arriba de la lista por debajo (cierre 1; antes iba dos veces y el CSS escondía una).
export function SelectorDelListado(props: {
  porPagina: PorPaginaDeLaLista | undefined
  aplicar: (tamano: number) => void
  className?: string
}) {
  const estado = usePorPaginaDelListado(props.porPagina?.valor ?? 0, props.aplicar)
  if (!props.porPagina) {
    return null
  }
  return (
    <SelectorDePorPagina
      opciones={props.porPagina.opciones}
      estado={estado}
      {...(props.className ? { className: props.className } : {})}
    />
  )
}

// «Ítems por página»: el mismo texto y el mismo control en todo listado. Es un `<select>` nativo (en el celular abre el
// selector del sistema). Con el mouse o el dedo cambia al elegir; con las flechas del teclado, en cambio, recorre los
// tamaños sin ir al servidor cada vez: se confirma con Enter o al salir del campo, y Esc lo deja como estaba.
export function SelectorDePorPagina({ opciones, estado, className }: Props) {
  const [tecleado, setTecleado] = useState<number | null>(null)
  const conFlecha = useRef(false)
  // Falso mientras la página llega del servidor, verdadero cuando React ya enganchó el control: un cambio anterior se
  // perdería. Lo mira el e2e (`data-hidratado`); a quien usa la pantalla no le cambia nada.
  const hidratado = useSyncExternalStore(
    sinSuscripcion,
    () => true,
    () => false,
  )
  const confirmar = () => {
    if (tecleado !== null) {
      const elegido = tecleado
      setTecleado(null)
      estado.elegir(elegido)
    }
  }
  return (
    <div className={cn('grid justify-items-end gap-1', className)}>
      <label className="flex items-center gap-2 text-(length:--text-sm) text-(--color-ink-soft)">
        <span className="whitespace-nowrap">Ítems por página</span>
        <select
          data-hidratado={hidratado}
          value={String(tecleado ?? estado.visto)}
          className="h-11 min-w-0 rounded-lg border border-(--color-line-strong) bg-(--color-surface) px-2.5 text-(length:--text-base) text-(--color-ink) tabular-nums outline-none focus-visible:shadow-(--shadow-focus) md:h-9 md:text-(length:--text-sm)"
          onKeyDown={(evento) => {
            if (FLECHAS.has(evento.key)) {
              conFlecha.current = true
            } else if (evento.key === 'Enter' && tecleado !== null) {
              evento.preventDefault()
              confirmar()
            } else if (evento.key === 'Escape') {
              setTecleado(null)
            }
          }}
          onKeyUp={() => {
            conFlecha.current = false
          }}
          onChange={(evento) => {
            const tamano = Number(evento.target.value)
            // Un tamaño que el selector no ofrece (un `<option>` agregado desde las herramientas del navegador) no se guarda ni se
            // aplica: la página volvería con el tamaño de siempre y `usePorPaginaDelListado` seguiría mostrando el elegido (5a-15).
            if (!opciones.includes(tamano)) {
              evento.target.value = String(tecleado ?? estado.visto)
              return
            }
            if (conFlecha.current) {
              setTecleado(tamano)
            } else {
              estado.elegir(tamano)
            }
          }}
          onBlur={confirmar}
        >
          {opciones.map((tamano) => (
            <option key={tamano} value={tamano}>
              {tamano}
            </option>
          ))}
        </select>
      </label>
      {estado.esperandoRed ? (
        <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
          Sin conexión: se aplicará cuando vuelva la red.
        </p>
      ) : null}
      {estado.sinGuardar ? (
        <p
          role="status"
          className="flex flex-wrap items-center justify-end gap-2 text-(length:--text-sm) text-(--color-ink-soft)"
        >
          No se pudo guardar tu preferencia: esta página igual muestra {estado.visto}.
          <Button variant="ghost" className="h-11 md:h-8" onClick={estado.reintentarGuardado}>
            Reintentar
          </Button>
        </p>
      ) : null}
    </div>
  )
}
