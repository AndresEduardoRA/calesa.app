'use client'

import { useState } from 'react'
import { enfocarPrimerError } from '@/shared/lib/formularios'
import { avisarExito } from '@/shared/ui/toasts'
import {
  BORRADOR_DE_SALIDA_NUEVA,
  esCampoDeSalida,
  validarSalida,
  type BorradorDeSalida,
  type CampoDeSalida,
} from '../../../entities/transiciones/formulario-de-salida'
import type { SalidasDeLaFase } from './use-salidas-de-la-fase'

type Args = { salidas: SalidasDeLaFase; alCerrar: () => void }

// El estado de «Agregar salida»: lo escrito, el motivo junto a cada campo y el envío. El id del intento nace al abrir y se conserva en cada reintento
// (repetirlo no duplica: la base dice «ya existe» sobre el campo `id` y se trata como hecho). Un conflicto lo dice el aviso de arriba del flujo y lo escrito
// se conserva; cualquier otro rechazo que la base ata a un campo va junto a ese campo (con el foco ahí), y el resto, arriba del formulario.
export function useFormularioDeSalida({ salidas, alCerrar }: Args) {
  const [intento] = useState(() => crypto.randomUUID())
  const [valores, setValores] = useState<BorradorDeSalida>(BORRADOR_DE_SALIDA_NUEVA)
  const [errores, setErrores] = useState<Partial<Record<CampoDeSalida, string>>>({})
  const [aviso, setAviso] = useState<string | null>(null)

  function escribir(cambios: Partial<BorradorDeSalida>, campo: CampoDeSalida) {
    setValores((antes) => ({ ...antes, ...cambios }))
    setErrores((antes) => ({ ...antes, [campo]: undefined }))
  }

  function enfocar(formulario: HTMLFormElement | null) {
    requestAnimationFrame(() => {
      enfocarPrimerError(formulario)
    })
  }

  async function enviar(formulario: HTMLFormElement | null): Promise<boolean> {
    const validado = validarSalida(valores, salidas.destinos)
    if (!validado.ok) {
      setErrores(validado.errores)
      setAviso(null)
      enfocar(formulario)
      return false
    }
    setAviso(null)
    const envio = await salidas.agregar(intento, validado.datos)
    if (envio === null) {
      return false
    }
    if (envio.ok) {
      avisarExito('Salida agregada.')
      alCerrar()
      return true
    }
    const porCampo = 'porCampo' in envio ? envio.porCampo : undefined
    // Otro intento con el mismo id ya la creó (se perdió la respuesta): está hecho.
    if (envio.error.codigo === 'duplicado' && porCampo?.['id'] !== undefined) {
      salidas.releer()
      alCerrar()
      return true
    }
    const campo = Object.keys(porCampo ?? {}).find(esCampoDeSalida)
    if (campo !== undefined) {
      setErrores({ [campo]: porCampo?.[campo] })
      enfocar(formulario)
    } else if (envio.error.codigo === 'conflicto') {
      salidas.rechazar(envio)
    } else {
      setAviso(envio.error.mensaje)
    }
    return false
  }

  return {
    valores,
    errores,
    aviso,
    enCurso: salidas.enCurso,
    hayCambios: JSON.stringify(valores) !== JSON.stringify(BORRADOR_DE_SALIDA_NUEVA),
    escribir,
    enviar,
  }
}
