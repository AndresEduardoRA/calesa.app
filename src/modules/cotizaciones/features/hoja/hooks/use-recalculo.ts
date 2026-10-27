'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { fallo, type Resultado } from '@/shared/lib/errores'
import type { RecalculoInicial } from '../../../entities/apertura'
import { ENTRADAS_VACIAS, type Entradas } from '../../../entities/entradas'
import {
  pideRecargar,
  type EstadoDeRecalculo,
  type RespuestaDeRecalculo,
} from '../../../entities/recalculo'

// Lo que se espera desde la última confirmación hasta pedir el recálculo (`docs/UX.md` › «Cotizar», 3).
export const ESPERA_DE_RECALCULO_MS = 150

type Pedir = (entradas: Entradas) => Promise<Resultado<RespuestaDeRecalculo>>

// Lo que recibe quien espera el total al día para guardar (P8): las entradas que calculó ese recálculo y su respuesta, o por qué no llegó (`se_fue`: la hoja se desmontó o la
// pantalla se escondió).
export type AlDia =
  | { ok: true; entradas: Entradas; respuesta: RespuestaDeRecalculo | null }
  | { ok: false; porque: 'fallo' | 'se_fue' }
type Espera = (r: AlDia) => void

type Motor = {
  // Está montado y a la vista: un efecto lo marca y lo apaga al desmontar o al esconderse (Next guarda la pantalla oculta y StrictMode monta dos veces).
  vivo: boolean
  temporizador: ReturnType<typeof setTimeout> | null
  enVuelo: boolean
  // Algo se confirmó y todavía no salió su pedido.
  pendiente: boolean
  // Sube con cada confirmación: una respuesta de otra generación ya no sirve, tampoco si es un error.
  generacion: number
  entradas: Entradas
  respuesta: RespuestaDeRecalculo | null
  // El último estado puesto, para quien pregunta desde un manejador antes de que React dibuje.
  estado: EstadoDeRecalculo
  // Quien espera el total al día (a lo sumo uno): se llama desde la resolución del pedido, nunca desde un efecto.
  espera: Espera | null
}

// La que esperaba recibe su resultado una sola vez.
function avisarALaQueEspera(m: Motor, r: AlDia): void {
  const espera = m.espera
  m.espera = null
  espera?.(r)
}

type PonerEstado = (estado: EstadoDeRecalculo) => void

// Sale UN pedido con las entradas de este momento y aplica su respuesta sólo si sigue siendo la más nueva.
function enviarPedido(
  m: Motor,
  pedir: Pedir,
  ponerRespuesta: (respuesta: RespuestaDeRecalculo) => void,
  ponerEstado: PonerEstado,
): void {
  const entradas = m.entradas
  const mia = m.generacion
  m.enVuelo = true
  m.pendiente = false
  ponerEstado({ tipo: 'recalculando' })
  void Promise.resolve()
    .then(() => pedir(entradas))
    .catch((): Resultado<RespuestaDeRecalculo> => fallo('inesperado', 'Sin respuesta.'))
    .then((resultado) => {
      m.enVuelo = false
      if (!m.vivo) {
        return
      }
      if (m.generacion !== mia) {
        // Se confirmó algo mientras iba: esta respuesta ya no sirve. Si su espera ya venció, sale ahora el pedido con lo último.
        if (m.pendiente && m.temporizador === null) {
          enviarPedido(m, pedir, ponerRespuesta, ponerEstado)
        }
        return
      }
      if (resultado.ok) {
        m.respuesta = resultado.data
        ponerRespuesta(resultado.data)
        ponerEstado({ tipo: 'al_dia' })
        avisarALaQueEspera(m, { ok: true, entradas, respuesta: resultado.data })
      } else {
        ponerEstado({ tipo: 'fallo', recargar: pideRecargar(resultado.error) })
        avisarALaQueEspera(m, { ok: false, porque: 'fallo' })
      }
    })
}

function esperarAlDia(m: Motor, fn: Espera): void {
  if (m.estado.tipo === 'esperando' || m.estado.tipo === 'recalculando') {
    m.espera = fn
    return
  }
  fn(
    m.estado.tipo === 'al_dia'
      ? { ok: true, entradas: m.entradas, respuesta: m.respuesta }
      : { ok: false, porque: 'fallo' },
  )
}

// Al desmontarse o esconderse: nada sale por su cuenta; lo que quedaba sin aplicar deja «No se pudo recalcular», y quien esperaba el total sabe que la hoja se fue.
function apagar(m: Motor, ponerEstado: PonerEstado): void {
  m.vivo = false
  if (m.temporizador !== null) {
    clearTimeout(m.temporizador)
    m.temporizador = null
  }
  const quedabaAlgo = m.pendiente || m.enVuelo
  m.pendiente = false
  m.enVuelo = false
  m.generacion += 1
  if (quedabaAlgo) {
    ponerEstado({ tipo: 'fallo', recargar: false })
  }
  avisarALaQueEspera(m, { ok: false, porque: 'se_fue' })
}

// La cola del recálculo de la hoja:
//  - cada confirmación reinicia una espera de 150 ms (se programa desde el manejador del evento, nunca desde un efecto);
//  - al vencer sale UN pedido con las entradas de ese momento; si ya hay uno en vuelo no sale otro: queda pendiente y sale uno solo, con lo más nuevo, cuando vuelve;
//  - una respuesta (o un error) sólo se aplica si nadie confirmó nada después de lo que ella calculó;
//  - nunca manda nada por su cuenta: al esconderse la pantalla se apaga y, si algo quedaba sin aplicar, deja «No se pudo recalcular» con «Reintentar».
// `pedir` tiene que ser estable: se lee una vez.
export function useRecalculo({
  inicial,
  pedir,
  espera = ESPERA_DE_RECALCULO_MS,
}: {
  inicial: RecalculoInicial
  pedir: Pedir
  espera?: number
}) {
  const [respuesta, setRespuesta] = useState(inicial.respuesta)
  const [estado, setEstadoDibujado] = useState<EstadoDeRecalculo>(inicial.estado)
  const pedirRef = useRef(pedir)
  const motor = useRef<Motor>({
    vivo: false,
    temporizador: null,
    enVuelo: false,
    pendiente: false,
    generacion: 0,
    entradas: ENTRADAS_VACIAS,
    respuesta: inicial.respuesta,
    estado: inicial.estado,
    espera: null,
  })
  const setEstado = useCallback((e: EstadoDeRecalculo) => {
    motor.current.estado = e
    setEstadoDibujado(e)
  }, [])

  const enviar = useCallback(
    () => enviarPedido(motor.current, pedirRef.current, setRespuesta, setEstado),
    [setEstado],
  )

  const alVencer = useCallback(() => {
    const m = motor.current
    m.temporizador = null
    if (m.vivo && !m.enVuelo) {
      enviar()
    }
  }, [enviar])

  const programar = useCallback(
    (entradas: Entradas) => {
      const m = motor.current
      m.entradas = entradas
      m.generacion += 1
      m.pendiente = true
      if (m.temporizador !== null) {
        clearTimeout(m.temporizador)
      }
      m.temporizador = setTimeout(alVencer, espera)
      setEstado({ tipo: 'esperando' })
    },
    [alVencer, espera, setEstado],
  )

  // «Reintentar» pasa por la misma puerta: si algo iba en vuelo, esa respuesta se descarta y sale uno solo.
  const reintentar = useCallback(() => {
    const m = motor.current
    m.generacion += 1
    m.pendiente = true
    if (m.temporizador === null && !m.enVuelo) {
      enviar()
    }
  }, [enviar])

  // El total al día para guardar (P8): si no hay nada en camino, enseguida con lo último; si no, con el último recálculo, el que da el total que la persona ve.
  const alQuedarAlDia = useCallback((fn: Espera) => {
    esperarAlDia(motor.current, fn)
  }, [])

  useEffect(() => {
    const m = motor.current
    m.vivo = true
    return () => {
      apagar(m, setEstado)
    }
  }, [setEstado])

  return { respuesta, estado, programar, reintentar, alQuedarAlDia }
}
