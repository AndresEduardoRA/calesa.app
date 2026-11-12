'use client'

import { useState } from 'react'
import { enviarAccion, type Envio } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import { cambiosDeGasto, type DatosDeGasto, type Gasto } from '../../../entities/dinero/gasto'
import type { GastoGuardado } from '../../../entities/dinero/repositorio-de-gastos'
import { guardarGasto } from '../actions/guardar-gasto'
import { registrarGasto } from '../actions/registrar-gasto'
import { avisarCambioDeDinero } from './eventos-de-dinero'

type Args = {
  unidadId: string
  // Nulo = «Registrar gasto».
  original: Gasto | null
  // El id del intento de alta: se conserva en cada reintento, así reenviar no duplica (D8 de 6.10-1).
  intento: string
  abierto: boolean
  alCerrar: () => void
  // Se guardó: tira el borrador.
  alGuardar: () => void
  // La base rechazó campos concretos: el motivo junto a cada uno.
  alRechazarCampos: (porCampo: Record<string, string>) => void
}

const MENSAJE_DE_VALIDACION = 'Revisa los datos del gasto.'

// El envío de un gasto (6.11-1): registrar o corregir por su Server Action y qué pasa con la respuesta. Un conflicto espera la versión nueva; sin conexión, lo escrito queda pendiente y sale
// solo al volver la red; un rechazo de la base se dice por campo o arriba del formulario.
export function useEnvioDeGasto({
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
  const [pendiente, setPendiente] = useState<DatosDeGasto | null>(null)
  const [enCurso, setEnCurso] = useState(false)

  function alRechazar(envio: Extract<Envio<GastoGuardado>, { ok: false }>) {
    setPendiente(null)
    if (envio.error.codigo === 'conflicto') {
      setConflicto(envio.error.mensaje)
    } else if ('porCampo' in envio && envio.porCampo && Object.keys(envio.porCampo).length > 0) {
      alRechazarCampos(envio.porCampo)
    } else {
      setAviso(envio.error.mensaje)
    }
  }

  async function pedir(datos: DatosDeGasto): Promise<Envio<GastoGuardado> | null> {
    if (!original) {
      return enviarAccion(
        registrarGasto({ id: intento, vehiculoId: unidadId, ...datos }),
        MENSAJE_DE_VALIDACION,
      )
    }
    const cambios = cambiosDeGasto(original, datos)
    return cambios === null
      ? null
      : enviarAccion(
          guardarGasto({ id: original.id, actualizadoEnEsperado: original.actualizadoEn, cambios }),
          MENSAJE_DE_VALIDACION,
        )
  }

  async function mandar(datos: DatosDeGasto): Promise<boolean> {
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
      avisarExito(original ? 'Gasto guardado.' : 'Gasto registrado.')
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
