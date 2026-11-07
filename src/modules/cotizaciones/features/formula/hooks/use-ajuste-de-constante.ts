'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { enviarAccion, type Envio } from '@/shared/lib/enviar-accion'
import { useRegional } from '@/shared/ui/regional'
import { avisarExito } from '@/shared/ui/toasts'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import { textoInicial, valorTipeado, type NodoDelAjuste } from '../../../entities/formula/ajuste'
import type { PropsDelAjuste } from '../../hoja/components/huecos'
import { cambiarConstante } from '../actions/cambiar-constante'
import { useValorPorDefecto, type EstadoDelValorPorDefecto } from './use-valor-por-defecto'

export const MENSAJE_SIN_SABER_SI_SE_CAMBIO =
  'No sabemos si se cambió: vuelve a leer el valor por defecto.'
const MENSAJE_DE_VALIDACION = 'No pudimos leer el pedido. Recarga y vuelve a intentar.'

// Lo que el panel dice sobre todos los bloques: el mensaje de la base tal cual y, si lo que se leyó ya no vale (otra publicada, o no se sabe si entró), «Volver a leer».
export type AvisoDelAjuste = { mensaje: string; volverALeer: boolean }

// Un bloque del panel: una constante que ajusta el ⚙, su valor por defecto (nulo si la publicada ya no la tiene), lo tipeado, la casilla y su aviso.
export type BloqueDeConstante = NodoDelAjuste & {
  porDefecto: number | null
  texto: string
  aplicar: boolean
  aviso: string | null
}

type Args = {
  origenId: string
  // Sólo las constantes de `nodosDelAjuste()`: un tipo de cambio no tiene formulario.
  nodos: readonly NodoDelAjuste[]
  hoja: PropsDelAjuste['hoja']
  cerrar: () => void
}

const exito = (nombre: string, aplicada: boolean) =>
  aplicada
    ? `Cambiaste el valor por defecto de ${nombre} y lo aplicaste a esta cotización.`
    : `Cambiaste el valor por defecto de ${nombre}. Esta cotización no cambia.`

// Qué hacer con lo que respondió la action: cerrar, avisar sobre todos los bloques (con «Volver a leer» si lo leído ya no vale) o bajo el campo.
type Desenlace =
  { tipo: 'hecho' } | { tipo: 'aviso'; aviso: AvisoDelAjuste } | { tipo: 'campo'; mensaje: string }

function desenlaceDe(envio: Envio<string>): Desenlace {
  if (envio.ok) {
    return { tipo: 'hecho' }
  }
  if ('sinRed' in envio) {
    return { tipo: 'aviso', aviso: { mensaje: MENSAJE_SIN_SABER_SI_SE_CAMBIO, volverALeer: true } }
  }
  const delCampo = envio.porCampo?.['valor']
  if (delCampo !== undefined) {
    return { tipo: 'campo', mensaje: delCampo }
  }
  return {
    tipo: 'aviso',
    aviso: { mensaje: envio.error.mensaje, volverALeer: envio.error.codigo === 'conflicto' },
  }
}

// Lo tipeado de cada bloque, su casilla y su aviso. El primer valor leído abre los campos; lo tipeado después no lo pisa ninguna lectura nueva.
function useBloques(
  nodos: readonly NodoDelAjuste[],
  estado: EstadoDelValorPorDefecto,
  locale: string,
) {
  const [iniciales, setIniciales] = useState<Record<string, string> | null>(null)
  const [textos, setTextos] = useState<Record<string, string>>({})
  const [aplicar, setAplicar] = useState<Record<string, boolean>>({})
  const [avisos, setAvisos] = useState<Record<string, string | null>>({})
  if (estado.tipo === 'listo' && iniciales === null) {
    const abiertos: Record<string, string> = {}
    for (const n of nodos) {
      const valor = estado.valores[n.nodo]
      abiertos[n.nodo] = valor == null ? '' : textoInicial(valor, n.formato, locale)
    }
    setIniciales(abiertos)
    setTextos(abiertos)
  }
  const bloques: BloqueDeConstante[] = nodos.map((n) => ({
    ...n,
    porDefecto: estado.tipo === 'listo' ? (estado.valores[n.nodo] ?? null) : null,
    texto: textos[n.nodo] ?? '',
    aplicar: aplicar[n.nodo] === true,
    aviso: avisos[n.nodo] ?? null,
  }))
  return {
    bloques,
    setAvisos,
    escribir: (nodo: string, texto: string) => {
      setTextos((antes) => ({ ...antes, [nodo]: texto }))
      setAvisos((antes) => ({ ...antes, [nodo]: null }))
    },
    marcar: (nodo: string, valor: boolean) => {
      setAplicar((antes) => ({ ...antes, [nodo]: valor }))
    },
    hayCambios: bloques.some(
      (b) => b.aplicar || (iniciales !== null && b.texto !== (iniciales[b.nodo] ?? '')),
    ),
  }
}

const textoDeOtraVersion = (estado: EstadoDelValorPorDefecto, deLaHoja: number) =>
  estado.tipo === 'listo' && estado.version !== deLaHoja
    ? `Esta hoja usa la versión ${String(deLaHoja)} de la fórmula; cambias la ${String(estado.version)}, la publicada.`
    : null

// El ⚙ de una constante (4.20-3b): lee el valor por defecto de la publicada, abre cada campo con él y publica la N+1 de la fórmula del origen con
// `cambiarConstante`. La esperada es **la publicada que se leyó** (P2), nunca la versión que dibuja la hoja: no se publica sobre un valor que no se vio. Un envío a la vez
// en todo el panel. «Aplicar también a esta cotización» cambia la celda como si se tipeara (`alConfirmar`), sólo tras la respuesta buena y sólo si el nodo se edita aquí.
export function useAjusteDeConstante({ origenId, nodos, hoja, cerrar }: Args) {
  const { locale } = useRegional()
  const lectura = useValorPorDefecto({ origenId, nodos: nodos.map((n) => n.nodo) })
  const accion = useAction(cambiarConstante)
  const { mandar, enCurso } = useUnEnvioALaVez()
  const [aviso, setAviso] = useState<AvisoDelAjuste | null>(null)
  const { estado } = lectura
  const { bloques, setAvisos, escribir, marcar, hayCambios } = useBloques(nodos, estado, locale)

  async function enviar(nodo: string): Promise<void> {
    const bloque = bloques.find((b) => b.nodo === nodo)
    if (estado.tipo !== 'listo' || bloque === undefined || aviso?.volverALeer === true) {
      return
    }
    const leido = valorTipeado(bloque.texto, bloque.formato, locale, bloque.porDefecto)
    if (!leido.ok) {
      setAvisos((antes) => ({ ...antes, [nodo]: leido.aviso }))
      return
    }
    setAviso(null)
    setAvisos({})
    const envio = await mandar(() =>
      enviarAccion(
        accion.executeAsync({
          origenId,
          nodo,
          valor: leido.valor,
          publicadaEsperada: estado.publicadaId,
        }),
        MENSAJE_DE_VALIDACION,
      ),
    )
    if (envio === null) {
      return
    }
    const desenlace = desenlaceDe(envio)
    if (desenlace.tipo === 'campo') {
      setAvisos({ [nodo]: desenlace.mensaje })
    } else if (desenlace.tipo === 'aviso') {
      setAviso(desenlace.aviso)
    } else {
      const aplicada = bloque.aplicar && bloque.editable
      if (aplicada) {
        hoja.alConfirmar(nodo, leido.valor)
      }
      avisarExito(exito(bloque.nombre, aplicada))
      cerrar()
    }
  }

  return {
    lectura: estado,
    reintentar: lectura.releer,
    bloques,
    escribir,
    marcar,
    enviar,
    enCurso,
    aviso,
    // La publicada nueva llega con la lectura; lo tipeado queda.
    volverALeer: () => {
      setAviso(null)
      lectura.releer()
    },
    otraVersion: textoDeOtraVersion(estado, hoja.formula.version),
    hayCambios,
  }
}

export type AjusteDeConstante = ReturnType<typeof useAjusteDeConstante>
