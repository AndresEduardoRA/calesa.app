'use client'

import { useId, useMemo, useState, type KeyboardEvent } from 'react'
import {
  aCuerpoConTokens,
  claveDeReferencia,
  consultaAbierta,
  etiquetaLibre,
  type MencionElegida,
  type OpcionDeMencion,
  type Referencia,
} from '../../../entities/menciones'

type Props = {
  texto: string
  cursor: number
  // El redactor aplica el texto nuevo y deja el cursor donde se dice.
  alReemplazar: (texto: string, cursor: number) => void
}

type Armado = { cuerpo: string; menciones: Referencia[]; demasiadas: boolean }

type Acciones = {
  cerrar: () => void
  mover: (paso: number) => void
  elegir: () => void
  hayOpciones: boolean
}

// Las teclas del selector abierto: Escape lo cierra; flechas, Enter y Tab sólo con opciones (sin ellas, Enter sigue enviando). `true` si era del selector.
function aplicarTecla(evento: KeyboardEvent<HTMLTextAreaElement>, a: Acciones): boolean {
  if (evento.nativeEvent.isComposing) {
    return false
  }
  const teclas: Record<string, (() => void) | undefined> = {
    Escape: a.cerrar,
    ArrowDown: a.hayOpciones
      ? () => {
          a.mover(1)
        }
      : undefined,
    ArrowUp: a.hayOpciones
      ? () => {
          a.mover(-1)
        }
      : undefined,
    Enter: a.hayOpciones && !evento.shiftKey ? a.elegir : undefined,
    Tab: a.hayOpciones ? a.elegir : undefined,
  }
  const accion = teclas[evento.key]
  if (accion === undefined) {
    return false
  }
  evento.preventDefault()
  accion()
  return true
}

// La parte del redactor que sabe de menciones, sin red: la consulta abierta tras el cursor, lo elegido, la opción activa y el teclado. El campo
// guarda `#Nombre`; el token `#[clase:id]` se arma al enviar (D5, D12). La lista de opciones la informa el selector, que es quien busca.
export function useMencionesEnRedactor({ texto, cursor, alReemplazar }: Props) {
  const base = useId()
  const [elegidas, setElegidas] = useState<MencionElegida[]>([])
  const [informadas, setInformadas] = useState<OpcionDeMencion[]>([])
  const [descartada, setDescartada] = useState<number | null>(null)
  const [movida, setMovida] = useState({ clave: '', indice: 0 })
  const abierta = useMemo(() => consultaAbierta(texto, cursor), [texto, cursor])
  const consulta = abierta !== null && abierta.inicio !== descartada ? abierta : null
  const opciones = consulta === null ? [] : informadas
  const clave = `${String(consulta?.inicio)}:${consulta?.texto ?? ''}`
  const activa =
    movida.clave === clave ? Math.min(movida.indice, Math.max(opciones.length - 1, 0)) : 0

  function elegir(opcion: OpcionDeMencion) {
    if (consulta === null) {
      return
    }
    const etiqueta = etiquetaLibre(opcion.etiqueta, opcion, elegidas)
    const ya = elegidas.some((e) => claveDeReferencia(e) === claveDeReferencia(opcion))
    if (!ya) {
      setElegidas([...elegidas, { clase: opcion.clase, id: opcion.id, etiqueta }])
    }
    const nuevo = `${texto.slice(0, consulta.inicio)}${etiqueta} ${texto.slice(cursor)}`
    alReemplazar(nuevo, consulta.inicio + etiqueta.length + 1)
  }

  function mover(paso: number) {
    setMovida({ clave, indice: (activa + paso + opciones.length) % opciones.length })
  }

  function alTeclear(evento: KeyboardEvent<HTMLTextAreaElement>): boolean {
    if (consulta === null) {
      return false
    }
    return aplicarTecla(evento, {
      cerrar: () => {
        setDescartada(consulta.inicio)
      },
      mover,
      elegir: () => {
        const elegida = opciones[activa]
        if (elegida) {
          elegir(elegida)
        }
      },
      hayOpciones: opciones.length > 0,
    })
  }

  return {
    consulta: consulta?.texto ?? null,
    abierto: consulta !== null,
    activa,
    hayOpciones: opciones.length > 0,
    idDelSelector: `${base}-menciones`,
    idDeOpcion: (indice: number) => `${base}-opcion-${String(indice)}`,
    informarOpciones: setInformadas,
    elegir,
    alTeclear,
    armar: (escrito: string): Armado => aCuerpoConTokens(escrito, elegidas),
    limpiar: () => {
      setElegidas([])
      setDescartada(null)
    },
  }
}
