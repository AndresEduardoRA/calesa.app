'use client'

import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { useEnvioDeModal } from '@/shared/ui/use-envio-de-modal'
import { avisarExito } from '@/shared/ui/toasts'
import {
  borradorDeCategoria,
  BORRADOR_NUEVO_DE_CATEGORIA,
  cambiosDeCategoria,
  validarCategoria,
  type BorradorDeCategoria,
  type CategoriaDeGasto,
} from '../../../entities/dinero/categoria'
import { crearCategoria } from '../actions/crear-categoria'
import { guardarCategoria } from '../actions/guardar-categoria'

type Args = {
  // Nulo = «Nueva categoría».
  original: CategoriaDeGasto | null
  abierto: boolean
  alCerrar: () => void
  // Se guardó: la lista se vuelve a leer.
  alGuardar: () => void
}

const MENSAJE_DE_VALIDACION = 'Revisa los datos de la categoría.'

// El formulario de una categoría de gasto (6.11-4): el borrador y su envío (`useEnvioDeModal`). Al editar sólo se manda lo que cambió; sin diferencias, cerrar es guardar. El nombre repetido lo dice la base
// junto al campo.
export function useFormularioDeCategoria({ original, abierto, alCerrar, alGuardar }: Args) {
  const inicial = original ? borradorDeCategoria(original) : BORRADOR_NUEVO_DE_CATEGORIA
  const [valores, setValores] = useState<BorradorDeCategoria>(inicial)

  const envio = useEnvioDeModal({
    abierto,
    hayCambios: JSON.stringify(valores) !== JSON.stringify(inicial),
    validar: () => {
      const validado = validarCategoria(valores)
      return validado.ok ? null : validado.errores
    },
    pedir: async () => {
      const validado = validarCategoria(valores)
      if (!validado.ok) {
        return { ok: false, error: { codigo: 'validacion', mensaje: MENSAJE_DE_VALIDACION } }
      }
      const datos = validado.datos
      if (!original) {
        return enviarAccion(crearCategoria(datos), MENSAJE_DE_VALIDACION)
      }
      const cambios = cambiosDeCategoria(original, datos)
      return cambios === null
        ? { ok: true as const, data: original }
        : enviarAccion(
            guardarCategoria({ id: original.id, nombre: original.nombre, cambios }),
            MENSAJE_DE_VALIDACION,
          )
    },
    alGuardar: () => {
      avisarExito('Categoría guardada.')
      alGuardar()
      alCerrar()
    },
    campoDelRechazo: (error) => (error.codigo === 'duplicado' ? 'nombre' : null),
  })

  return {
    ...envio,
    valores,
    escribir: (cambios: Partial<BorradorDeCategoria>) => {
      setValores((antes) => ({ ...antes, ...cambios }))
      for (const clave of Object.keys(cambios)) {
        envio.quitarMotivo(clave)
      }
    },
  }
}
