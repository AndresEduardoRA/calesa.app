'use client'

import { useRef, useState } from 'react'
import { fallo, type ErrorApp } from '@/shared/lib/errores'
import { cumpleElMinimo } from '@/shared/lib/filtros'
import {
  buscarUnidades,
  NO_SE_BUSCO,
  type UnidadesBuscadas,
} from '../../../areas/aduana/composicion.client'
import { MINIMO_DE_BUSQUEDA_DE_ADUANA } from '../../../entities/aduana/filtros'

export type Busqueda =
  | { tipo: 'sin-buscar' }
  | { tipo: 'cargando' }
  | { tipo: 'error'; error: ErrorApp }
  | { tipo: 'listo'; resultado: UnidadesBuscadas }

// La búsqueda de vehículos para agregar (6.09-2): se pide al enviar el campo (Enter o «Buscar»), no a cada letra, y una respuesta vieja no pisa a una más nueva. Con menos de 3 letras o
// dígitos no llama a la base y dice por qué.
export function useBuscarUnidades() {
  const [texto, setTexto] = useState('')
  const [busqueda, setBusqueda] = useState<Busqueda>({ tipo: 'sin-buscar' })
  const [aviso, setAviso] = useState<string | null>(null)
  const pedido = useRef(0)

  async function buscar() {
    if (!cumpleElMinimo(texto.trim(), MINIMO_DE_BUSQUEDA_DE_ADUANA)) {
      setAviso(MINIMO_DE_BUSQUEDA_DE_ADUANA.aviso)
      return
    }
    setAviso(null)
    pedido.current += 1
    const este = pedido.current
    setBusqueda({ tipo: 'cargando' })
    const resultado = await buscarUnidades(texto).catch(() => fallo('inesperado', NO_SE_BUSCO))
    if (este === pedido.current) {
      setBusqueda(
        resultado.ok
          ? { tipo: 'listo', resultado: resultado.data }
          : { tipo: 'error', error: resultado.error },
      )
    }
  }

  return {
    texto,
    escribir: (valor: string) => {
      setTexto(valor)
      setAviso(null)
    },
    aviso,
    busqueda,
    buscar,
  }
}
