'use client'

import { useRef, useState } from 'react'
import type { ErrorApp, Resultado } from '@/shared/lib/errores'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { leerPaginaDeActividad } from '../../../composicion.client'
import type { FilaDeActividad, PaginaDeActividad } from '../../../entities/actividad'
import { hastaDeUnDia, type PedidoDeActividad } from '../../../entities/filtros'

type Clase = 'mas' | 'salto' | 'volver'
type Fallido = { clase: Clase; dia: string | null }

type Estado = {
  filas: FilaDeActividad[]
  hayMas: boolean
  // El día de «Ir a una fecha» que se mira; nulo desde lo más reciente.
  desde: string | null
  pidiendo: Clase | null
  error: ErrorApp | null
  fallido: Fallido | null
}

type Parametros = { inicial: PaginaDeActividad; pedido: PedidoDeActividad; zona: string }

const caido = (): Resultado<PaginaDeActividad> => ({
  ok: false,
  error: { codigo: 'inesperado', mensaje: 'No se pudo cargar la actividad.' },
})

// La actividad cargada: la primera página la trae el servidor; «Ver más» junta la siguiente (sin repetir ids), «Ir a una fecha» reemplaza lo
// cargado por ese día y lo anterior, y «Volver a lo más reciente» vuelve a empezar. Un pedido a la vez; falle como falle, lo cargado se queda.
// Otros filtros = otra `key` del listado: este estado nace de nuevo.
export function useActividad({ inicial, pedido, zona }: Parametros) {
  const [estado, setEstado] = useState<Estado>({
    filas: inicial.filas,
    hayMas: inicial.hayMas,
    desde: null,
    pidiendo: null,
    error: null,
    fallido: null,
  })
  const enVuelo = useRef(false)

  const siguiente = estado.hayMas ? (estado.filas.at(-1)?.id ?? null) : null

  function pedir(clase: Clase, dia: string | null) {
    if (enVuelo.current) {
      return
    }
    const hasta = clase === 'salto' && dia !== null ? hastaDeUnDia(dia, zona) : null
    if (clase === 'salto' && hasta === null) {
      return
    }
    const antesId = clase === 'mas' ? siguiente : null
    if (clase === 'mas' && antesId === null) {
      return
    }
    enVuelo.current = true
    setEstado((e) => ({ ...e, pidiendo: clase, error: null }))
    leerPaginaDeActividad({ ...pedido, antesId, hasta })
      .catch(caido)
      .then((resultado) => {
        setEstado((e) => aplicar(e, clase, dia, resultado))
      })
      .catch(() => undefined)
      .finally(() => {
        enVuelo.current = false
      })
  }

  const enElTope = estado.filas.length >= TOPE_DE_LO_CARGADO && estado.hayMas
  return {
    ...estado,
    siguiente,
    ocupado: estado.pidiendo !== null,
    cargandoMas: estado.pidiendo === 'mas',
    enElTope,
    hayMasParaPedir: estado.hayMas && !enElTope,
    verMas: () => {
      pedir('mas', null)
    },
    irAUnaFecha: (dia: string) => {
      pedir('salto', dia)
    },
    volver: () => {
      pedir('volver', null)
    },
    reintentar: () => {
      if (estado.fallido) {
        pedir(estado.fallido.clase, estado.fallido.dia)
      }
    },
  }
}

function aplicar(
  e: Estado,
  clase: Clase,
  dia: string | null,
  resultado: Resultado<PaginaDeActividad>,
): Estado {
  if (!resultado.ok) {
    return { ...e, pidiendo: null, error: resultado.error, fallido: { clase, dia } }
  }
  const { filas, hayMas } = resultado.data
  if (clase === 'mas') {
    const vistas = new Set(e.filas.map((f) => f.id))
    const juntas = [...e.filas, ...filas.filter((f) => !vistas.has(f.id))]
    return {
      ...e,
      filas: juntas.slice(0, TOPE_DE_LO_CARGADO),
      hayMas,
      pidiendo: null,
      error: null,
      fallido: null,
    }
  }
  return {
    filas,
    hayMas,
    desde: clase === 'salto' ? dia : null,
    pidiendo: null,
    error: null,
    fallido: null,
  }
}

export type ActividadCargada = ReturnType<typeof useActividad>
