'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MENSAJE_INESPERADO, type ErrorApp, type Resultado } from '@/shared/lib/errores'
import { TAMANO_DE_VER_MAS, TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { leerPaginaDeConversaciones, suscribirseALaLista } from '../../../composicion.client'
import {
  cursorDe,
  fundirPagina,
  sumarPagina,
  type Conversacion,
  type PaginaDeConversaciones,
} from '../../../entities/conversaciones'

type Props = {
  usuarioId: string
  // La primera página, ya leída en el servidor (o el error con que falló: la lista lo dice y deja reintentar).
  inicial: Resultado<PaginaDeConversaciones>
}

const ERROR_INESPERADO: ErrorApp = { codigo: 'inesperado', mensaje: MENSAJE_INESPERADO }

// Una ráfaga de señales (varios mensajes seguidos, las dos tablas a la vez) es una sola relectura.
const ESPERA_DE_LA_SENAL_MS = 250

// Una lectura que no llegó (sin red) se dice como error, no como excepción.
async function leer(
  pedido: Parameters<typeof leerPaginaDeConversaciones>[0],
): Promise<Resultado<PaginaDeConversaciones>> {
  try {
    return await leerPaginaDeConversaciones(pedido)
  } catch {
    return { ok: false, error: ERROR_INESPERADO }
  }
}

// Cada señal de Realtime (con una ráfaga unida en una) relee la primera página.
function useSenalesDeLaLista(usuarioId: string, recargar: () => Promise<void>) {
  useEffect(() => {
    let espera: ReturnType<typeof setTimeout> | null = null
    const programar = () => {
      if (espera) {
        clearTimeout(espera)
      }
      espera = setTimeout(() => {
        espera = null
        void recargar()
      }, ESPERA_DE_LA_SENAL_MS)
    }
    const desuscribir = suscribirseALaLista(usuarioId, {
      alCambiar: programar,
      alReconectar: programar,
    })
    return () => {
      desuscribir()
      if (espera) {
        clearTimeout(espera)
      }
    }
  }, [usuarioId, recargar])
}

// El estado de la lista de `/chat`: lo cargado, «Ver más» por cursor hasta el tope y la fusión de la primera página cada
// vez que Realtime avisa (la fila del canal es sólo señal: se relee por la RPC). `recargar()` lo usan las acciones que
// crean o dejan una conversación.
export function useListaDeConversaciones({ usuarioId, inicial }: Props) {
  const [filas, setFilas] = useState<Conversacion[]>(inicial.ok ? inicial.data.conversaciones : [])
  const [hayMas, setHayMas] = useState(inicial.ok ? inicial.data.hayMas : false)
  const [errorDeLista, setErrorDeLista] = useState<ErrorApp | null>(
    inicial.ok ? null : inicial.error,
  )
  const [cargandoMas, setCargandoMas] = useState(false)
  const [errorAlCargarMas, setErrorAlCargarMas] = useState<ErrorApp | null>(null)
  // Cuántas veces se pidió «Ver más»: con ninguna, lo que dice la fusión sobre «hay más» es lo que vale.
  const paginasMas = useRef(0)

  const recargar = useCallback(async () => {
    const lectura = await leer({ tamano: TAMANO_DE_VER_MAS })
    if (!lectura.ok) {
      // Un fallo deja lo que hay: la lista no se rompe por una señal. Sólo una lista vacía dice el error.
      setFilas((antes) => {
        if (antes.length === 0) {
          setErrorDeLista(lectura.error)
        }
        return antes
      })
      return
    }
    setErrorDeLista(null)
    setFilas((antes) => fundirPagina(antes, lectura.data.conversaciones, lectura.data.hayMas))
    if (paginasMas.current === 0) {
      setHayMas(lectura.data.hayMas)
    }
  }, [])

  useSenalesDeLaLista(usuarioId, recargar)

  // Dejar una conversación no genera señal (Realtime no avisa de un DELETE): la fila se quita a mano.
  const quitar = useCallback((id: string) => {
    setFilas((antes) => antes.filter((c) => c.id !== id))
  }, [])

  const ultima = filas.at(-1)
  const cargarMas = async () => {
    if (!ultima || cargandoMas) {
      return
    }
    setCargandoMas(true)
    setErrorAlCargarMas(null)
    const lectura = await leer({
      desde: cursorDe(ultima),
      tamano: Math.min(TAMANO_DE_VER_MAS, Math.max(TOPE_DE_LO_CARGADO - filas.length, 1)),
    })
    setCargandoMas(false)
    if (!lectura.ok) {
      setErrorAlCargarMas(lectura.error)
      return
    }
    paginasMas.current += 1
    setFilas((antes) => sumarPagina(antes, lectura.data.conversaciones))
    setHayMas(lectura.data.hayMas)
  }

  return {
    filas,
    hayMas,
    errorDeLista,
    cargandoMas,
    errorAlCargarMas,
    cargarMas,
    recargar,
    quitar,
    enElTope: filas.length >= TOPE_DE_LO_CARGADO,
  }
}
