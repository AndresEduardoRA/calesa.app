'use client'

import { useAction } from 'next-safe-action/hooks'
import { useReducer, useState } from 'react'
import { consultarFicha } from '../../../composicion.client'
import type { CampoConRuta } from '../../../entities/subasta'
import { respuestaDe } from '../../fotos/envio'
import { buscarRepetidos } from '../actions/buscar-repetidos'
import { consultarLineas } from '../consulta'
import { lineasDePegado, reducirLineas, type EstadoDeLinea, type Linea } from '../lineas'

type Args = {
  origenId: string
  // Los campos activos del layout: los que tienen ruta de apibara se llenan con lo que trae.
  campos: readonly CampoConRuta[]
}

// Las líneas pegadas y su consulta a apibara, con la pantalla conectada: qué línea está en qué
// estado, si hay algo en curso y cuántas se recortaron por pasar del tope.
export function useConsultaDeSubasta({ origenId, campos }: Args) {
  const [lineas, despachar] = useReducer(reducirLineas, [] as Linea[])
  const [consultando, setConsultando] = useState(false)
  const [recortadas, setRecortadas] = useState(0)
  const repetidos = useAction(buscarRepetidos)

  async function correr(aConsultar: readonly Linea[]) {
    setConsultando(true)
    try {
      return await consultarLineas(aConsultar, {
        campos,
        consultarFicha: (entrada) => consultarFicha(origenId, entrada),
        buscarRepetidos: (claves) =>
          respuestaDe(repetidos.executeAsync({ origenId, claves: [...claves] })),
        alCambiar: (clave, estado) => {
          despachar({ tipo: 'estado', clave, estado })
        },
      })
    } finally {
      setConsultando(false)
    }
  }

  return {
    lineas,
    consultando,
    recortadas,
    // Interpreta lo pegado y consulta lo que se entiende. Devuelve las líneas como quedaron.
    consultar: async (texto: string): Promise<Linea[]> => {
      const pegado = lineasDePegado(texto)
      setRecortadas(pegado.recortadas)
      despachar({ tipo: 'cargar', lineas: pegado.lineas })
      const finales = await correr(pegado.lineas.filter((linea) => linea.entrada !== null))
      return pegado.lineas.map((linea) => ({
        ...linea,
        estado: finales.get(linea.clave) ?? linea.estado,
      }))
    },
    reintentar: async (linea: Linea): Promise<Linea> => {
      const finales = await correr([linea])
      return { ...linea, estado: finales.get(linea.clave) ?? linea.estado }
    },
    fijarEstado: (clave: string, estado: EstadoDeLinea) => {
      despachar({ tipo: 'estado', clave, estado })
    },
    vaciar: () => {
      despachar({ tipo: 'vaciar' })
      setRecortadas(0)
    },
  }
}
