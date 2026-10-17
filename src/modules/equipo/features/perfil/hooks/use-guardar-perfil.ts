'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState, type RefObject } from 'react'
import { enfocarPrimerError, errorDeAccion } from '@/shared/lib/formularios'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import { descartarAvatar, subirAvatar } from '../../../composicion.client'
import { guardarPerfil } from '../actions/guardar-perfil'

// Qué hacer con la foto al guardar. Elegir un archivo no sube nada: se sube al confirmar.
export type CambioDeFoto = { tipo: 'igual' } | { tipo: 'nueva'; archivo: File } | { tipo: 'quitar' }

type Entrada = {
  usuarioId: string
  // Lo que hay guardado al abrir el formulario.
  avatarRuta: string | null
  actualizadoEn: string
  formulario: RefObject<HTMLFormElement | null>
}

// La fila no se guardó: la foto recién subida (y su miniatura) no quedó en ningún perfil.
function descartarSubida(nueva: { ruta: string; miniatura: string } | null | undefined): void {
  if (nueva) {
    void descartarAvatar(nueva.ruta)
    void descartarAvatar(nueva.miniatura)
  }
}

// La foto que había, si se cambió o se quitó. Su miniatura no: la encola un trigger y la borra storage-gc (cierre 1).
function descartarAnterior(anterior: string | null, nueva: string | null | undefined): void {
  if (nueva !== undefined && anterior && anterior !== nueva) {
    void descartarAvatar(anterior)
  }
}

export function useGuardarPerfil({ usuarioId, avatarRuta, actualizadoEn, formulario }: Entrada) {
  const { executeAsync, result, isPending } = useAction(guardarPerfil)
  const [subiendo, setSubiendo] = useState(false)
  // Después de guardar, la próxima edición compara contra lo que acaba de quedar.
  const [guardado, setGuardado] = useState({ avatarRuta, actualizadoEn })

  // Sube la foto (si hay una nueva, con su miniatura) y devuelve qué guardar: undefined = no tocarla; null = quitarla.
  async function resolverFoto(
    foto: CambioDeFoto,
  ): Promise<{ ruta: string; miniatura: string } | null | undefined | 'fallo'> {
    if (foto.tipo === 'igual') {
      return undefined
    }
    if (foto.tipo === 'quitar') {
      return null
    }
    const subida = await subirAvatar(usuarioId, foto.archivo)
    if (!subida.ok) {
      avisarError(subida.error)
      return 'fallo'
    }
    return subida.data
  }

  // Devuelve true si quedó guardado.
  async function guardar(nombre: string, foto: CambioDeFoto): Promise<boolean> {
    setSubiendo(true)
    const nueva = await resolverFoto(foto)
    setSubiendo(false)
    if (nueva === 'fallo') {
      return false
    }
    const nuevaRuta = nueva === undefined ? undefined : (nueva?.ruta ?? null)
    const resultado = await executeAsync({
      nombre,
      avatarRuta: nuevaRuta,
      ...(nueva ? { avatarMiniaturaRuta: nueva.miniatura } : {}),
      actualizadoEnEsperado: guardado.actualizadoEn,
    })
    if (!resultado.data?.ok) {
      descartarSubida(nueva)
      const error = errorDeAccion(resultado)
      if (error) {
        avisarError(error)
      }
      enfocarPrimerError(formulario.current)
      return false
    }
    descartarAnterior(guardado.avatarRuta, nuevaRuta)
    setGuardado({
      avatarRuta: nuevaRuta === undefined ? guardado.avatarRuta : nuevaRuta,
      actualizadoEn: resultado.data.data.actualizadoEn,
    })
    avisarExito('Perfil guardado')
    return true
  }

  return {
    guardar,
    enCurso: subiendo || isPending,
    errores: result.validationErrors?.fieldErrors,
  }
}
