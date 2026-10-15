'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarError } from '@/shared/ui/toasts'
import {
  conEtiqueta,
  ordenarEtiquetas,
  sinEtiqueta,
  TEXTO_DEL_MOTIVO,
  validarNombreDeEtiqueta,
  type ColorDeEtiqueta,
  type Etiqueta,
} from '../../../entities/etiqueta'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { crearEtiqueta } from '../actions/crear-etiqueta'

const firmaDe = (lista: readonly Etiqueta[]) =>
  lista.map((una) => `${una.id}:${una.actualizadoEn}`).join(',')

// Las etiquetas de quien mira: la lista la trae el servidor; lo que se crea se suma en su lugar y
// se relee la página. Crear lleva el id del intento: si el pedido no llegó, el reintento con el
// mismo nombre usa el mismo id y la base no la duplica.
export function useEtiquetas(inicial: readonly Etiqueta[]) {
  const router = useRouter()
  const firma = firmaDe(inicial)
  const [vista, setVista] = useState(firma)
  const [lista, setLista] = useState<Etiqueta[]>([...inicial])
  if (vista !== firma) {
    setVista(firma)
    setLista([...inicial])
  }
  const crear = useAction(crearEtiqueta)
  const intentos = useRef(new Map<string, string>())

  // Crea una etiqueta con ese nombre. Devuelve la etiqueta, o el motivo para decirlo junto al campo.
  async function crearCon(
    crudo: string,
    color: ColorDeEtiqueta | null = null,
  ): Promise<{ ok: true; etiqueta: Etiqueta } | { ok: false; motivo: string }> {
    const valido = validarNombreDeEtiqueta(crudo, lista)
    if (!valido.ok) {
      return { ok: false, motivo: TEXTO_DEL_MOTIVO[valido.motivo] }
    }
    const clave = valido.nombre.toLocaleLowerCase('es')
    const id = intentos.current.get(clave) ?? crypto.randomUUID()
    intentos.current.set(clave, id)
    const envio = await enviarAccion(
      crear.executeAsync({ id, nombre: valido.nombre, color }),
      MENSAJE_DE_VALIDACION,
    )
    if (!envio.ok) {
      if ('sinRed' in envio) {
        avisarError(envio.error)
        return { ok: false, motivo: envio.error.mensaje }
      }
      intentos.current.delete(clave)
      return { ok: false, motivo: envio.porCampo?.['nombre'] ?? envio.error.mensaje }
    }
    intentos.current.delete(clave)
    const etiqueta = envio.data.etiqueta
    if (!etiqueta) {
      return { ok: false, motivo: 'No pudimos crear la etiqueta. Vuelve a intentarlo.' }
    }
    setLista((antes) => ordenarEtiquetas(conEtiqueta(antes, etiqueta)))
    router.refresh()
    return { ok: true, etiqueta }
  }

  return {
    lista,
    crear: crearCon,
    creando: crear.isPending,
    // Lo que cambió en «Gestionar»: en su lugar, o fuera.
    poner: (una: Etiqueta) => {
      setLista((antes) => ordenarEtiquetas(conEtiqueta(antes, una)))
    },
    quitar: (id: string) => {
      setLista((antes) => sinEtiqueta(antes, id))
    },
  }
}

export type Etiquetas = ReturnType<typeof useEtiquetas>
