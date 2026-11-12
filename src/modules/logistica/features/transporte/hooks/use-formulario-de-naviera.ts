'use client'

import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnvioDeModal } from '@/shared/ui/use-envio-de-modal'
import {
  borradorDeNaviera,
  BORRADOR_NUEVO_DE_NAVIERA,
  cambiosDeNaviera,
  validarNaviera,
  type BorradorDeNaviera,
  type NavieraDeCatalogo,
} from '../../../entities/transporte/catalogo'
import { crearNaviera } from '../actions/crear-naviera'
import { guardarNaviera } from '../actions/guardar-naviera'

type Args = {
  // Nulo = «Nueva naviera».
  original: NavieraDeCatalogo | null
  abierto: boolean
  alCerrar: () => void
  // Se guardó: la lista se vuelve a leer.
  alGuardar: () => void
}

const MENSAJE_DE_VALIDACION = 'Revisa los datos de la naviera.'

// El formulario de una naviera (6.08-1): el borrador y su envío (`useEnvioDeModal`). Al editar sólo se manda lo que cambió; sin diferencias, cerrar es guardar. El nombre repetido lo dice la base junto al campo.
export function useFormularioDeNaviera({ original, abierto, alCerrar, alGuardar }: Args) {
  const inicial = original ? borradorDeNaviera(original) : BORRADOR_NUEVO_DE_NAVIERA
  const [valores, setValores] = useState<BorradorDeNaviera>(inicial)

  const envio = useEnvioDeModal({
    abierto,
    hayCambios: JSON.stringify(valores) !== JSON.stringify(inicial),
    validar: () => {
      const validado = validarNaviera(valores)
      return validado.ok ? null : validado.errores
    },
    pedir: async () => {
      const validado = validarNaviera(valores)
      if (!validado.ok) {
        return { ok: false, error: { codigo: 'validacion', mensaje: MENSAJE_DE_VALIDACION } }
      }
      const datos = validado.datos
      if (!original) {
        return enviarAccion(crearNaviera(datos), MENSAJE_DE_VALIDACION)
      }
      const cambios = cambiosDeNaviera(original, datos)
      return cambios === null
        ? { ok: true as const, data: original }
        : enviarAccion(
            guardarNaviera({ id: original.id, nombre: original.nombre, cambios }),
            MENSAJE_DE_VALIDACION,
          )
    },
    alGuardar: () => {
      avisarExito('Naviera guardada.')
      alGuardar()
      alCerrar()
    },
    campoDelRechazo: (error) => (error.codigo === 'duplicado' ? 'nombre' : null),
  })

  return {
    ...envio,
    valores,
    escribir: (cambios: Partial<BorradorDeNaviera>) => {
      setValores((antes) => ({ ...antes, ...cambios }))
      for (const clave of Object.keys(cambios)) {
        envio.quitarMotivo(clave)
      }
    },
  }
}
