'use client'

import { useEffect, useState, type KeyboardEvent, type RefObject } from 'react'
import { LARGO_MAXIMO_DE_TITULO } from '@/modules/agenda/client'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { comandoDelTexto, type ComandoDelChat, type Referencia } from '../../../entities/menciones'
import type { TextoValido } from '../../../entities/mensajes'
import { useMencionesEnRedactor } from '../../menciones/hooks/use-menciones-en-redactor'

const MUCHAS_MENCIONES = 'Puedes mencionar hasta 20 veces en un mensaje.'

type Props = {
  alEnviar: (cuerpo: string, menciones: readonly Referencia[]) => TextoValido
  campo: RefObject<HTMLTextAreaElement | null>
  // 7.10-3: `/tarea` o `/evento` al enviar no manda texto: vacía el campo y abre su formulario con lo escrito como título.
  alComando?: (comando: ComandoDelChat, resto: string) => void
}

// El estado del redactor: el texto con su cursor, el aviso y las menciones. El campo guarda `#Nombre`; al enviar se arma el cuerpo con los tokens y el
// largo se mide con ellos (D5). Después de enviar se limpia y el foco se queda.
export function useRedactor({ alEnviar, campo, alComando }: Props) {
  const [texto, setTexto] = useState('')
  const [cursor, setCursor] = useState(0)
  const [colocar, setColocar] = useState<number | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const menciones = useMencionesEnRedactor({
    texto,
    cursor,
    alReemplazar: (nuevo, posicion) => {
      setTexto(nuevo)
      setCursor(posicion)
      setColocar(posicion)
    },
  })
  const selectorMontado = useAbiertoAlgunaVez(menciones.abierto)

  // Tras elegir, el cursor va detrás de la mención: hay que esperar a que el campo tenga el texto nuevo.
  useEffect(() => {
    if (colocar !== null) {
      campo.current?.setSelectionRange(colocar, colocar)
    }
  }, [colocar, campo])

  // Mientras el texto empieza con un comando, el aviso dice que Enter abre su formulario (sin autocompletado: es descubrible y nada más).
  const comando = alComando ? comandoDelTexto(texto, LARGO_MAXIMO_DE_TITULO) : null

  function enviar() {
    if (comando !== null && alComando) {
      setTexto('')
      setCursor(0)
      setAviso(null)
      menciones.limpiar()
      alComando(comando.comando, comando.resto)
      return
    }
    const armado = menciones.armar(texto)
    if (armado.demasiadas) {
      setAviso(MUCHAS_MENCIONES)
      return
    }
    const valido = alEnviar(armado.cuerpo, armado.menciones)
    if (valido.ok) {
      setTexto('')
      setCursor(0)
      setAviso(null)
      menciones.limpiar()
    } else if (valido.motivo === 'largo') {
      setAviso(valido.mensaje ?? null)
    }
    campo.current?.focus()
  }

  return {
    texto,
    aviso,
    comando: comando?.comando ?? null,
    menciones,
    selectorMontado,
    alCambiar: (nuevo: string, posicion: number) => {
      setTexto(nuevo)
      setCursor(posicion)
      setAviso(null)
    },
    alSeleccionar: setCursor,
    // Primero el selector; si no era suyo, Enter envía y Mayús+Enter salta de línea (nunca mientras se compone con un IME).
    alTeclear: (evento: KeyboardEvent<HTMLTextAreaElement>) => {
      if (menciones.alTeclear(evento)) {
        return
      }
      if (evento.key === 'Enter' && !evento.shiftKey && !evento.nativeEvent.isComposing) {
        evento.preventDefault()
        enviar()
      }
    },
    enviar,
  }
}
