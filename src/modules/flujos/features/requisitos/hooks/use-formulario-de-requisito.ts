'use client'

import { useState } from 'react'
import type { Envio } from '@/shared/lib/enviar-accion'
import { enfocarPrimerError } from '@/shared/lib/formularios'
import { avisarExito } from '@/shared/ui/toasts'
import type { VersionNueva } from '../../../entities/requisitos/respuestas'
import type { RequisitosDeLaFase } from './use-requisitos-de-la-fase'

type Validacion<R, C extends string> =
  { ok: true; valor: R } | { ok: false; errores: Partial<Record<C, string>>; aviso?: string }

type Args<V, C extends string, R> = {
  requisitos: RequisitosDeLaFase
  inicial: V
  // El campo de formulario al que la base ató su rechazo (el `hint`), si es de este formulario.
  esCampo: (campo: string | undefined) => campo is C
  validar: (valores: V) => Validacion<R, C>
  // El envío con el id del intento (el mismo en cada reintento) y lo validado.
  mandar: (valor: R, intento: string) => Promise<Envio<VersionNueva> | null>
  mensajeDeExito: string
  alCerrar: () => void
}

// El estado de un formulario de requisito (dato, documento, espera o edición): lo escrito, el motivo junto a cada campo y el envío. El id del intento nace al
// abrir y se conserva en cada reintento (repetirlo no duplica). Un conflicto lo dice el aviso de arriba del flujo y lo escrito se conserva; cualquier otro
// rechazo que la base ata a un campo va junto a ese campo (con el foco ahí), y el resto, arriba del formulario.
export function useFormularioDeRequisito<V extends object, C extends string, R>({
  requisitos,
  inicial,
  esCampo,
  validar,
  mandar,
  mensajeDeExito,
  alCerrar,
}: Args<V, C, R>) {
  const [intento] = useState(() => crypto.randomUUID())
  const [valores, setValores] = useState<V>(inicial)
  const [errores, setErrores] = useState<Partial<Record<C, string>>>({})
  const [aviso, setAviso] = useState<string | null>(null)

  function escribir(cambios: Partial<V>, campo: C) {
    setValores((antes) => ({ ...antes, ...cambios }))
    setErrores((antes) => ({ ...antes, [campo]: undefined }))
  }

  // El foco va al primer campo con error cuando ya se dibujó.
  function enfocar(formulario: HTMLFormElement | null) {
    requestAnimationFrame(() => {
      enfocarPrimerError(formulario)
    })
  }

  async function enviar(formulario: HTMLFormElement | null): Promise<boolean> {
    const validado = validar(valores)
    if (!validado.ok) {
      setErrores(validado.errores)
      setAviso(validado.aviso ?? null)
      enfocar(formulario)
      return false
    }
    setAviso(null)
    const envio = await mandar(validado.valor, intento)
    if (envio === null) {
      return false
    }
    if (envio.ok) {
      avisarExito(mensajeDeExito)
      alCerrar()
      return true
    }
    return repartirRechazo(envio, formulario)
  }

  // Lo que la base rechazó: ya estaba hecho (mismo intento), un campo, un conflicto o un aviso arriba.
  function repartirRechazo(
    envio: Envio<VersionNueva> & { ok: false },
    formulario: HTMLFormElement | null,
  ): boolean {
    // Otro intento con el mismo id ya lo creó (se perdió la respuesta): está hecho.
    if (envio.error.codigo === 'duplicado' && !('sinRed' in envio)) {
      requisitos.releer()
      alCerrar()
      return true
    }
    const campo = 'porCampo' in envio ? Object.keys(envio.porCampo ?? {}).find(esCampo) : undefined
    if (campo !== undefined && 'porCampo' in envio) {
      setErrores({ [campo]: envio.porCampo?.[campo] } as Partial<Record<C, string>>)
      enfocar(formulario)
    } else if (envio.error.codigo === 'conflicto') {
      requisitos.rechazar(envio)
    } else {
      setAviso(envio.error.mensaje)
    }
    return false
  }

  return {
    valores,
    errores,
    aviso,
    enCurso: requisitos.enCurso,
    hayCambios: JSON.stringify(valores) !== JSON.stringify(inicial),
    escribir,
    enviar,
  }
}
