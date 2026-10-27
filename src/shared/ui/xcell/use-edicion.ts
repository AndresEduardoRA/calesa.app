'use client'

// La edición de una celda: abrir, escribir, confirmar y cerrar. Sin efectos: todo pasa en el manejador del teclado o del foco.
import { useRef, useState, type KeyboardEvent } from 'react'
import type { TeclaDeCierre } from './entrada-de-xcell'
import {
  abreConSuCaracter,
  hayCambio,
  leerTipeado,
  textoParaEditar,
  type FormatoDeXCell,
  type Lado,
} from './estado'

export type { Lado }

export type DatosDeLado = {
  id: string
  formato: FormatoDeXCell
  valor: number | null
  decimales: number | undefined
}

export type Edicion = {
  lado: Lado
  texto: string
  // El texto con el que se habría abierto: contra él se mide si hubo un cambio.
  abierto: string
  // El aviso de lo escrito que no se leyó como número (`null` mientras se lee bien).
  aviso: string | null
  seleccion: 'todo' | 'final'
}

type Entrada = {
  ladoDe: (lado: Lado) => DatosDeLado
  // El candado de cada lado (4.13-3c): un lado bloqueado no abre; el otro sí.
  bloqueado: (lado: Lado) => boolean
  locale: string
  onCommit: (id: string, valor: number | null) => void
}

export function useEdicion({ ladoDe, bloqueado, locale, onCommit }: Entrada) {
  const [edicion, setEdicion] = useState<Edicion | null>(null)
  // Mientras la edición espera su cierre: el `blur` que llega después de Enter o de Tab ya no confirma otra vez.
  const abierta = useRef(false)
  // Al cerrar con Enter o Esc el botón del valor vuelve a montarse; este lado recibe el foco, una sola vez.
  // Nunca al montar la celda: 300 celdas se robarían el foco.
  const volverARef = useRef<Lado | null>(null)

  // Si la base bloquea el lado que se edita, la edición deja de existir (se ajusta durante el render, sin efecto); si bloquea el otro, sigue.
  if (edicion !== null && bloqueado(edicion.lado)) {
    setEdicion(null)
  }

  function abrir(lado: Lado, escrito: string | null, seleccion: 'todo' | 'final') {
    if (bloqueado(lado)) {
      return
    }
    const l = ladoDe(lado)
    const completo = textoParaEditar(l.valor, l.formato, locale)
    abierta.current = true
    setEdicion({ lado, texto: escrito ?? completo, abierto: completo, aviso: null, seleccion })
  }

  function terminar() {
    abierta.current = false
    setEdicion(null)
  }

  // Emite sólo si cambió; devuelve el aviso si lo escrito no se lee como número (la edición sigue abierta con él), o null.
  function confirmar(e: Edicion): string | null {
    const l = ladoDe(e.lado)
    const leido = leerTipeado(e.texto, l.formato, locale)
    if (!leido.ok) {
      return leido.aviso
    }
    if (hayCambio(e.abierto, e.texto, leido.valor, l.valor)) {
      onCommit(l.id, leido.valor)
    }
    return null
  }

  function alCerrar(tecla: TeclaDeCierre, evento: KeyboardEvent<HTMLInputElement>) {
    if (edicion === null) {
      return
    }
    if (tecla === 'esc') {
      volverARef.current = edicion.lado
      terminar()
      return
    }
    const aviso = confirmar(edicion)
    if (aviso !== null) {
      // Ni Enter ni Tab siguen su camino con un texto que no es un número.
      evento.preventDefault()
      setEdicion({ ...edicion, aviso })
    } else if (tecla === 'enter') {
      volverARef.current = edicion.lado
      terminar()
    } else {
      // Tab: la entrada queda hasta que pierde el foco. Desmontarla acá, antes de que el navegador lo mueva, deja el foco sin lugar de partida.
      abierta.current = false
    }
  }

  function alPerderElFoco() {
    if (edicion !== null && abierta.current) {
      // Un clic afuera confirma lo escrito si es un número y, si no, lo descarta.
      confirmar(edicion)
    }
    terminar()
  }

  function alEscribir(texto: string) {
    if (edicion !== null) {
      setEdicion({ ...edicion, texto, aviso: null })
    }
  }

  function alTeclearEnElValor(lado: Lado, evento: KeyboardEvent<HTMLButtonElement>) {
    if (bloqueado(lado)) {
      return
    }
    const { key, ctrlKey, metaKey, altKey } = evento
    if (abreConSuCaracter(key, ctrlKey, metaKey, altKey)) {
      // Sin `preventDefault` el navegador inserta el carácter otra vez en la entrada que se monta («55»).
      evento.preventDefault()
      abrir(lado, key, 'final')
    } else if (key === 'F2') {
      evento.preventDefault()
      abrir(lado, null, 'todo')
    } else if (key === 'Backspace' || key === 'Delete') {
      evento.preventDefault()
      abrir(lado, '', 'final')
    }
  }

  return { edicion, volverARef, abrir, alCerrar, alPerderElFoco, alEscribir, alTeclearEnElValor }
}
