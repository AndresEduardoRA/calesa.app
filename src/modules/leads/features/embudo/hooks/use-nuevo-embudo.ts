'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { useEnvioDeModal } from '@/shared/ui/use-envio-de-modal'
import { MAXIMO_DE_EMBUDOS, validarNombreDeEmbudo, type Embudo } from '../../../entities/embudo'
import type { ResultadoDeEmbudo } from '../../../entities/repositorios-de-oportunidades'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { crearEmbudo } from '../actions/crear-embudo'

export const CLAVE_DEL_NOMBRE_DE_EMBUDO = 'nombre-de-embudo'

type Args = {
  embudos: readonly Embudo[]
  alCrear: (id: string) => void
}

// El estado del modal «Nuevo embudo»: el nombre, validado como en la base. El id del intento vive mientras el diálogo está
// abierto (un reintento no crea dos), también el que sale solo al volver la conexión. Un nombre que la base rechaza se dice
// junto al campo; lo demás (sin permiso…) arriba del formulario.
export function useNuevoEmbudo({ embudos, alCrear }: Args) {
  const [intento] = useState(() => crypto.randomUUID())
  const [nombre, setNombre] = useState('')
  const crear = useAction(crearEmbudo)
  const lleno = embudos.length >= MAXIMO_DE_EMBUDOS

  const envio = useEnvioDeModal<ResultadoDeEmbudo>({
    abierto: true,
    hayCambios: nombre.trim() !== '',
    validar: () => {
      const motivo = lleno
        ? `Puedes tener hasta ${String(MAXIMO_DE_EMBUDOS)} embudos. Elimina uno para crear otro.`
        : validarNombreDeEmbudo(nombre, embudos, null)
      return motivo ? { [CLAVE_DEL_NOMBRE_DE_EMBUDO]: motivo } : null
    },
    pedir: () =>
      enviarAccion(
        crear.executeAsync({ id: intento, nombre: nombre.trim() }),
        MENSAJE_DE_VALIDACION,
      ),
    alGuardar: (hecho) => {
      alCrear(hecho.embudo?.id ?? intento)
    },
    campoDelRechazo: (error) => (error.codigo === 'regla' ? CLAVE_DEL_NOMBRE_DE_EMBUDO : null),
  })

  return {
    ...envio,
    nombre,
    lleno,
    escribir: (valor: string) => {
      setNombre(valor)
      envio.quitarMotivo(CLAVE_DEL_NOMBRE_DE_EMBUDO)
    },
  }
}
