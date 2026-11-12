'use client'

import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisar, avisarExito } from '@/shared/ui/toasts'
import { validarMotivoDeAnulacion, type Pago } from '../../../entities/dinero/pago'
import { anularPago } from '../actions/anular-pago'
import { avisarCambioDeDinero } from './eventos-de-dinero'

type Args = { unidadId: string; pago: Pago | null; alCerrar: () => void }

const MENSAJE_DE_VALIDACION = 'Revisa el motivo de la anulación.'

// Anular un pago confirmado (6.11-2): el motivo junto al campo si falta o sobra; el rechazo general de la base (la fase actual pide pagos confirmados y la anulación la deja sin cumplir) se dice
// dentro del drawer, que no se cierra. Un conflicto («ya no está», o lo cambió otra persona) no es un error para quien anulaba: se cierra, se dice y se vuelve a leer.
export function useAnulacionDePago({ unidadId, pago, alCerrar }: Args) {
  const [motivo, setMotivo] = useState('')
  const [errorDelMotivo, setErrorDelMotivo] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [enCurso, setEnCurso] = useState(false)

  async function enviar(): Promise<boolean> {
    if (!pago || enCurso) {
      return false
    }
    const validado = validarMotivoDeAnulacion(motivo)
    if (!validado.ok) {
      setErrorDelMotivo(validado.error)
      return false
    }
    setErrorDelMotivo(null)
    setAviso(null)
    setEnCurso(true)
    const envio = await enviarAccion(
      anularPago({
        id: pago.id,
        actualizadoEnEsperado: pago.actualizadoEn,
        motivo: validado.motivo,
      }),
      MENSAJE_DE_VALIDACION,
    )
    setEnCurso(false)
    if (envio.ok) {
      avisarCambioDeDinero(unidadId)
      avisarExito('Pago anulado.')
      alCerrar()
      return true
    }
    if (envio.error.codigo === 'conflicto') {
      avisarCambioDeDinero(unidadId)
      avisar(envio.error.mensaje)
      alCerrar()
      return false
    }
    if ('porCampo' in envio && envio.porCampo?.['motivo']) {
      setErrorDelMotivo(envio.porCampo['motivo'])
    } else {
      setAviso(envio.error.mensaje)
    }
    return false
  }

  return {
    motivo,
    errorDelMotivo,
    aviso,
    enCurso,
    hayCambios: motivo.trim() !== '',
    escribir: (texto: string) => {
      setMotivo(texto)
      setErrorDelMotivo(null)
    },
    enviar,
  }
}
