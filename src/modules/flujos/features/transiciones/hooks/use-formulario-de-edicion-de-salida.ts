'use client'

import { useState } from 'react'
import { enfocarPrimerError } from '@/shared/lib/formularios'
import { avisarExito } from '@/shared/ui/toasts'
import type { TransicionParaConfigurar } from '../../../entities/flujo'
import {
  LARGO_MAXIMO_DE_ACCION,
  MENSAJES_DE_SALIDA,
  cambiosDeSalida,
  esCampoDeSalida,
  type CampoDeSalida,
  type EdicionDeSalida,
} from '../../../entities/transiciones/formulario-de-salida'
import { alternarRol, mismosRoles } from '../../../entities/transiciones/roles-de-lista'
import type { SalidasDeLaFase } from './use-salidas-de-la-fase'

type Args = {
  salidas: SalidasDeLaFase
  salida: TransicionParaConfigurar
  rolesGuardados: readonly string[]
  alCerrar: () => void
}

// «sin red» y los demás avisos terminan en punto; el de «guardado a medias» lleva el motivo dentro de su frase.
const sinPunto = (texto: string) => texto.replace(/[.\s]+$/, '')

// El estado de «Editar» una salida: acción, nota y roles escritos, el motivo junto a cada campo y el envío. Manda sólo lo que cambió (primero la acción y la nota,
// luego los roles). Si lo primero quedó guardado y los roles no, la forma sigue abierta: la página releída hace de lo guardado el original y un segundo
// «Guardar» manda sólo lo que falta. Un conflicto lo dice el aviso de arriba del flujo y lo escrito se conserva.
export function useFormularioDeEdicionDeSalida({
  salidas,
  salida,
  rolesGuardados,
  alCerrar,
}: Args) {
  const [valores, setValores] = useState<EdicionDeSalida>({
    accion: salida.accion ?? '',
    notaObligatoria: salida.notaObligatoria,
  })
  const [roles, setRoles] = useState<string[]>(() => [...rolesGuardados])
  const [errores, setErrores] = useState<Partial<Record<CampoDeSalida, string>>>({})
  const [aviso, setAviso] = useState<string | null>(null)

  const cambios = cambiosDeSalida(salida, valores)
  const rolesCambiaron = !mismosRoles(roles, rolesGuardados)
  const hayCambios = cambios !== null || rolesCambiaron

  function escribir(nuevos: Partial<EdicionDeSalida>, campo: CampoDeSalida) {
    setValores((antes) => ({ ...antes, ...nuevos }))
    setErrores((antes) => ({ ...antes, [campo]: undefined }))
  }

  function marcarRol(rolId: string, marcado: boolean) {
    setRoles((antes) => alternarRol(antes, rolId, marcado))
    setErrores((antes) => ({ ...antes, roles: undefined }))
  }

  function enfocar(formulario: HTMLFormElement | null) {
    requestAnimationFrame(() => {
      enfocarPrimerError(formulario)
    })
  }

  async function enviar(formulario: HTMLFormElement | null): Promise<boolean> {
    setAviso(null)
    if (valores.accion.trim().length > LARGO_MAXIMO_DE_ACCION) {
      setErrores({ accion: MENSAJES_DE_SALIDA.accionLarga })
      enfocar(formulario)
      return false
    }
    if (!hayCambios) {
      setAviso(MENSAJES_DE_SALIDA.nadaQueGuardar)
      return false
    }
    const hecho = await salidas.editar(salida, cambios, rolesCambiaron ? roles : null)
    if (hecho === null) {
      return false
    }
    if (hecho.ok) {
      avisarExito('Salida guardada.')
      alCerrar()
      return true
    }
    const { envio, guardado } = hecho
    const porCampo = 'porCampo' in envio ? envio.porCampo : undefined
    const campo = Object.keys(porCampo ?? {}).find(esCampoDeSalida)
    if (envio.error.codigo === 'conflicto') {
      salidas.rechazar(envio)
    } else if (campo !== undefined) {
      setErrores({ [campo]: porCampo?.[campo] })
      enfocar(formulario)
    } else if (guardado) {
      setAviso(
        `Se guardaron la acción y la nota, pero no quién mueve: ${sinPunto(envio.error.mensaje)}.`,
      )
    } else {
      setAviso(envio.error.mensaje)
    }
    return false
  }

  return {
    valores,
    roles,
    errores,
    aviso,
    enCurso: salidas.enCurso,
    hayCambios,
    escribir,
    marcarRol,
    enviar,
  }
}
