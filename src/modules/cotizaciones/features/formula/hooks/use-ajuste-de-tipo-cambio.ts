'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { guardarTipoCambio } from '@/modules/empresa/client'
import { enviarAccion, type Envio } from '@/shared/lib/enviar-accion'
import { useRegional } from '@/shared/ui/regional'
import { avisarExito } from '@/shared/ui/toasts'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import {
  textoInicialDeTipoCambio,
  tipoCambioTipeado,
  type TipoCambioDelNodo,
} from '../../../entities/formula/tipo-cambio'
import type { PropsDelAjuste } from '../../hoja/components/huecos'
import type { AvisoDelAjuste } from './use-ajuste-de-constante'
import { useTipoCambioDelNodo } from './use-tipo-cambio-del-nodo'

export const MENSAJE_SIN_SABER_SI_CAMBIO_EL_TIPO =
  'No sabemos si se cambió: vuelve a leer el tipo de cambio.'
const MENSAJE_DE_VALIDACION = 'No pudimos leer el pedido. Recarga y vuelve a intentar.'

type Args = {
  // El nodo `tipo_cambio` del ⚙ (`nodosDelAjuste()`), que puede ser el secundario de la celda.
  nodo: string
  hoja: PropsDelAjuste['hoja']
  cerrar: () => void
}

type Desenlace =
  { tipo: 'hecho' } | { tipo: 'aviso'; aviso: AvisoDelAjuste } | { tipo: 'campo'; mensaje: string }

function desenlaceDe(envio: Envio<unknown>): Desenlace {
  if (envio.ok) {
    return { tipo: 'hecho' }
  }
  if ('sinRed' in envio) {
    return {
      tipo: 'aviso',
      aviso: { mensaje: MENSAJE_SIN_SABER_SI_CAMBIO_EL_TIPO, volverALeer: true },
    }
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

// Lo tipeado en «Valor nuevo»: lo abre la primera fila leída y ninguna lectura posterior lo pisa. `tipoCambio` es la última fila leída (sigue mientras se relee).
function useLoTipeado(fila: TipoCambioDelNodo | null, locale: string) {
  const [tipoCambio, setTipoCambio] = useState<TipoCambioDelNodo | null>(null)
  const [inicial, setInicial] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [avisoDelCampo, setAvisoDelCampo] = useState<string | null>(null)
  if (fila !== null && fila !== tipoCambio) {
    setTipoCambio(fila)
    if (inicial === null) {
      const abierto = textoInicialDeTipoCambio(fila.valor, locale)
      setInicial(abierto)
      setTexto(abierto)
    }
  }
  return {
    tipoCambio,
    texto,
    avisoDelCampo,
    setAvisoDelCampo,
    escribir: (nuevo: string) => {
      setTexto(nuevo)
      setAvisoDelCampo(null)
    },
    hayCambios: inicial !== null && texto !== inicial,
  }
}

// El ⚙ de una celda de tipo de cambio en la hoja nueva (4.20-3d): lee la fila que nombra el nodo en la versión de la hoja y la cambia para toda la empresa con
// `guardarTipoCambio` (`empresa`). Manda **sólo** `id`, la versión leída (`actualizadoEn`, con sus microsegundos) y el valor tipeado: nunca el nombre, `activo` ni el
// por defecto. Un envío a la vez. Con la respuesta buena avisa y cierra; la action revalida y la hoja se vuelve a abrir con el valor nuevo (P2 del 4.20-3d).
export function useAjusteDeTipoCambio({ nodo, hoja, cerrar }: Args) {
  const { locale } = useRegional()
  const lectura = useTipoCambioDelNodo({ formulaId: hoja.formula.id, nodo })
  const accion = useAction(guardarTipoCambio)
  const { mandar, enCurso } = useUnEnvioALaVez()
  const [aviso, setAviso] = useState<AvisoDelAjuste | null>(null)
  const { estado } = lectura
  const tipeado = useLoTipeado(estado.tipo === 'listo' ? estado.tipoCambio : null, locale)

  async function enviar(): Promise<void> {
    if (estado.tipo !== 'listo' || aviso?.volverALeer === true) {
      return
    }
    const fila = estado.tipoCambio
    const leido = tipoCambioTipeado(tipeado.texto, locale, fila.valor)
    if (!leido.ok) {
      tipeado.setAvisoDelCampo(leido.aviso)
      return
    }
    setAviso(null)
    tipeado.setAvisoDelCampo(null)
    const envio = await mandar(() =>
      enviarAccion(
        accion.executeAsync({
          id: fila.id,
          actualizadoEnEsperado: fila.actualizadoEn,
          valor: leido.valor,
        }),
        MENSAJE_DE_VALIDACION,
      ),
    )
    if (envio === null) {
      return
    }
    const desenlace = desenlaceDe(envio)
    if (desenlace.tipo === 'campo') {
      tipeado.setAvisoDelCampo(desenlace.mensaje)
    } else if (desenlace.tipo === 'aviso') {
      setAviso(desenlace.aviso)
    } else {
      avisarExito(`Cambiaste el tipo de cambio ${fila.nombre} para toda la empresa.`)
      cerrar()
    }
  }

  return {
    lectura: estado,
    reintentar: lectura.releer,
    tipoCambio: tipeado.tipoCambio,
    texto: tipeado.texto,
    avisoDelCampo: tipeado.avisoDelCampo,
    escribir: tipeado.escribir,
    enviar,
    enCurso,
    aviso,
    // La versión nueva llega con la lectura; lo tipeado queda.
    volverALeer: () => {
      setAviso(null)
      lectura.releer()
    },
    hayCambios: tipeado.hayCambios,
  }
}

export type AjusteDeTipoCambio = ReturnType<typeof useAjusteDeTipoCambio>
