'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MENSAJE_INESPERADO, type ErrorApp, type Resultado } from '@/shared/lib/errores'
import { TAMANO_DE_VER_MAS, TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { suscribirseACambios } from '@/shared/lib/supabase/canal.client'
import { leerPaginaDeNotificaciones } from '../../../composicion.client'
import { fundirPagina, sumarPagina } from '../../../entities/fundir'
import {
  cursorDe,
  type FiltroDeLista,
  type Notificacion,
  type PaginaDeNotificaciones,
} from '../../../entities/notificacion'
import { useMarcarTodas } from './use-marcar-todas'

type Props = {
  ver: FiltroDeLista
  usuarioId: string
  // La primera página, ya leída en el servidor.
  inicial: PaginaDeNotificaciones
}

const ERROR_INESPERADO: ErrorApp = { codigo: 'inesperado', mensaje: MENSAJE_INESPERADO }

// Una lectura que no llegó (sin red) se dice como error, no como excepción.
async function leer(
  pedido: Parameters<typeof leerPaginaDeNotificaciones>[0],
): Promise<Resultado<PaginaDeNotificaciones>> {
  try {
    return await leerPaginaDeNotificaciones(pedido)
  } catch {
    return { ok: false, error: ERROR_INESPERADO }
  }
}

// El estado de `/notificaciones`: lo cargado, «Ver más» por cursor hasta el tope, «Marcar todas como leídas» y la
// fusión de la primera página cada vez que Realtime avisa (la fila del canal es sólo señal: se relee por fetch).
// Se reinicia con la `key` de quien lo usa al cambiar el filtro.
export function useListaDeNotificaciones({ ver, usuarioId, inicial }: Props) {
  const [filas, setFilas] = useState<Notificacion[]>(inicial.filas)
  const [hayMas, setHayMas] = useState(inicial.hayMas)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [errorAlCargarMas, setErrorAlCargarMas] = useState<ErrorApp | null>(null)
  // Cuántas veces se pidió «Ver más»: con ninguna, lo que dice la fusión sobre «hay más» es lo que vale.
  const paginasMas = useRef(0)

  const releerLaPrimera = useCallback(async () => {
    const lectura = await leer({ ver, tamano: TAMANO_DE_VER_MAS })
    // Un fallo deja lo que hay: la lista no se rompe por una señal.
    if (!lectura.ok) {
      return
    }
    setFilas((antes) => fundirPagina(antes, lectura.data.filas, lectura.data.hayMas))
    if (paginasMas.current === 0) {
      setHayMas(lectura.data.hayMas)
    }
  }, [ver])

  useEffect(() => {
    const desuscribir = suscribirseACambios({
      tabla: 'notificaciones',
      filtro: `usuario_id=eq.${usuarioId}`,
      eventos: ['INSERT', 'UPDATE'],
      alCambiar: () => void releerLaPrimera(),
      alReconectar: () => void releerLaPrimera(),
    })
    return desuscribir
  }, [usuarioId, releerLaPrimera])

  const ultima = filas.at(-1)
  const verMas = async () => {
    if (!ultima || cargandoMas) {
      return
    }
    setCargandoMas(true)
    setErrorAlCargarMas(null)
    const lectura = await leer({
      ver,
      desde: cursorDe(ultima),
      tamano: Math.min(TAMANO_DE_VER_MAS, Math.max(TOPE_DE_LO_CARGADO - filas.length, 1)),
    })
    setCargandoMas(false)
    if (!lectura.ok) {
      setErrorAlCargarMas(lectura.error)
      return
    }
    paginasMas.current += 1
    setFilas((antes) => sumarPagina(antes, lectura.data.filas))
    setHayMas(lectura.data.hayMas)
  }

  const { marcando, quedanSinMarcar, marcarTodas } = useMarcarTodas(() => {
    const ahora = new Date().toISOString()
    setFilas((antes) =>
      antes.map((n) => (n.leida ? n : { ...n, leida: true, leidaEn: n.leidaEn ?? ahora })),
    )
  })

  // Abrir un aviso lo deja a la vista como leído de inmediato (lo marca `useAbrirAviso`; la señal trae lo demás).
  const hayNoLeidas = filas.some((n) => !n.leida)

  return {
    filas,
    hayMas,
    cargandoMas,
    errorAlCargarMas,
    verMas,
    marcarTodas,
    marcando,
    quedanSinMarcar,
    hayNoLeidas,
  }
}
