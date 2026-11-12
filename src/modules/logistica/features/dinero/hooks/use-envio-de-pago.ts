'use client'

import { useState } from 'react'
import { enviarAccion, type Envio } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import { cambiosDePago, type DatosDePago, type Pago } from '../../../entities/dinero/pago'
import type { PagoGuardado } from '../../../entities/dinero/repositorio-de-pagos'
import { guardarPago } from '../actions/guardar-pago'
import { registrarPago } from '../actions/registrar-pago'
import { useAmbitoDePago } from './ambito-de-pago'
import { avisarCambioDeDinero } from './eventos-de-dinero'

type Args = {
  unidadId: string
  // Nulo = «Registrar pago».
  original: Pago | null
  // El id del intento de alta: se conserva en cada reintento, así reenviar no duplica (D8 de 6.10-1).
  intento: string
  abierto: boolean
  alCerrar: () => void
  // Se guardó: tira el borrador.
  alGuardar: () => void
  // La base rechazó campos concretos: el motivo junto a cada uno.
  alRechazarCampos: (porCampo: Record<string, string>) => void
}

const MENSAJE_DE_VALIDACION = 'Revisa los datos del pago.'

// El envío de un pago (6.11-2): registrar o corregir por su Server Action y qué pasa con la respuesta. Un conflicto (casi siempre «ya está confirmado») espera la versión nueva; sin
// conexión, lo escrito queda pendiente y sale solo al volver la red; un rechazo de la base se dice por campo o arriba del formulario.
export function useEnvioDePago({
  unidadId,
  original,
  intento,
  abierto,
  alCerrar,
  alGuardar,
  alRechazarCampos,
}: Args) {
  const [aviso, setAviso] = useState<string | null>(null)
  const [conflicto, setConflicto] = useState<string | null>(null)
  const [pendiente, setPendiente] = useState<DatosDePago | null>(null)
  const [enCurso, setEnCurso] = useState(false)
  const ambito = useAmbitoDePago()

  function alRechazar(envio: Extract<Envio<PagoGuardado>, { ok: false }>) {
    setPendiente(null)
    if (envio.error.codigo === 'conflicto') {
      setConflicto(envio.error.mensaje)
    } else if ('porCampo' in envio && envio.porCampo && Object.keys(envio.porCampo).length > 0) {
      alRechazarCampos(envio.porCampo)
    } else {
      setAviso(envio.error.mensaje)
    }
  }

  async function pedir(datos: DatosDePago): Promise<Envio<PagoGuardado> | null> {
    if (!original) {
      return enviarAccion(
        registrarPago({
          id: intento,
          ...(ambito === 'proyecto' ? { proyectoId: unidadId } : { vehiculoId: unidadId }),
          ...datos,
        }),
        MENSAJE_DE_VALIDACION,
      )
    }
    const cambios = cambiosDePago(original, datos)
    return cambios === null
      ? null
      : enviarAccion(
          guardarPago({ id: original.id, actualizadoEnEsperado: original.actualizadoEn, cambios }),
          MENSAJE_DE_VALIDACION,
        )
  }

  async function mandar(datos: DatosDePago): Promise<boolean> {
    setAviso(null)
    setEnCurso(true)
    const envio = await pedir(datos)
    setEnCurso(false)
    if (envio === null) {
      // Sin diferencia no hay nada que guardar: se cierra.
      alCerrar()
      return true
    }
    if (envio.ok) {
      alGuardar()
      setPendiente(null)
      avisarCambioDeDinero(unidadId)
      avisarExito(original ? 'Pago guardado.' : 'Pago registrado.')
      alCerrar()
      return true
    }
    if ('sinRed' in envio) {
      setPendiente(datos)
    } else {
      alRechazar(envio)
    }
    return false
  }

  const enLinea = useReintentoAlVolver(abierto ? pendiente : null, mandar)

  return {
    mandar,
    aviso,
    conflicto,
    enCurso,
    enLinea,
    esperandoConexion: pendiente !== null,
  }
}
