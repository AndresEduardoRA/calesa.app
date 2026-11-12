'use client'

import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnvioDeModal } from '@/shared/ui/use-envio-de-modal'
import {
  borradorDePuerto,
  BORRADOR_NUEVO_DE_PUERTO,
  cambiosDePuerto,
  validarPuerto,
  type BorradorDePuerto,
  type PuertoDeCatalogo,
} from '../../../entities/transporte/catalogo'
import { crearPuerto } from '../actions/crear-puerto'
import { guardarPuerto } from '../actions/guardar-puerto'

type Args = {
  // Nulo = «Nuevo puerto».
  original: PuertoDeCatalogo | null
  abierto: boolean
  alCerrar: () => void
  // Se guardó: la lista se vuelve a leer.
  alGuardar: () => void
}

const MENSAJE_DE_VALIDACION = 'Revisa los datos del puerto.'

// El formulario de un puerto (6.08-1): el borrador y su envío (`useEnvioDeModal`). Al editar sólo se manda lo que cambió; sin diferencias, cerrar es guardar. El nombre repetido lo dice el servidor junto al campo.
export function useFormularioDePuerto({ original, abierto, alCerrar, alGuardar }: Args) {
  const inicial = original ? borradorDePuerto(original) : BORRADOR_NUEVO_DE_PUERTO
  const [valores, setValores] = useState<BorradorDePuerto>(inicial)

  const envio = useEnvioDeModal({
    abierto,
    hayCambios: JSON.stringify(valores) !== JSON.stringify(inicial),
    validar: () => {
      const validado = validarPuerto(valores)
      return validado.ok ? null : validado.errores
    },
    pedir: async () => {
      const validado = validarPuerto(valores)
      if (!validado.ok) {
        return { ok: false, error: { codigo: 'validacion', mensaje: MENSAJE_DE_VALIDACION } }
      }
      const datos = validado.datos
      if (!original) {
        return enviarAccion(crearPuerto(datos), MENSAJE_DE_VALIDACION)
      }
      const cambios = cambiosDePuerto(original, datos)
      return cambios === null
        ? { ok: true as const, data: original }
        : enviarAccion(
            guardarPuerto({
              id: original.id,
              nombre: original.nombre,
              pais: original.pais,
              cambios,
            }),
            MENSAJE_DE_VALIDACION,
          )
    },
    alGuardar: () => {
      avisarExito('Puerto guardado.')
      alGuardar()
      alCerrar()
    },
    campoDelRechazo: (error) => (error.codigo === 'duplicado' ? 'nombre' : null),
  })

  return {
    ...envio,
    valores,
    escribir: (cambios: Partial<BorradorDePuerto>) => {
      setValores((antes) => ({ ...antes, ...cambios }))
      for (const clave of Object.keys(cambios)) {
        envio.quitarMotivo(clave)
      }
    },
  }
}
