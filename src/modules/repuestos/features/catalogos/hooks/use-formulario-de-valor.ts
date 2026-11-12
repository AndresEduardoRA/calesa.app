'use client'

import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnvioDeModal } from '@/shared/ui/use-envio-de-modal'
import {
  borradorDeValor,
  BORRADOR_NUEVO_DE_VALOR,
  cambiosDeValor,
  ordenSiguiente,
  validarValor,
  type BorradorDeValor,
  type ClaveDeCatalogo,
  type ValorDeCatalogo,
} from '../../../entities/catalogos/catalogo'
import { crearValor } from '../actions/crear-valor'
import { guardarValor } from '../actions/guardar-valor'

type Args = {
  catalogo: ClaveDeCatalogo
  // Nulo = «Agregar».
  original: ValorDeCatalogo | null
  // Los del catálogo: lo nuevo nace al final (D33).
  valoresDelCatalogo: readonly ValorDeCatalogo[]
  abierto: boolean
  alCerrar: () => void
}

const MENSAJE_DE_VALIDACION = 'Revisa los datos del valor.'

// El formulario de un valor de catálogo (8.08-3): el borrador y su envío (`useEnvioDeModal`). Al editar sólo se manda lo que cambió; sin diferencias, cerrar es
// guardar. El nombre repetido lo dice la base junto al campo. La lista se renueva con el `revalidatePath` de la action.
export function useFormularioDeValor({
  catalogo,
  original,
  valoresDelCatalogo,
  abierto,
  alCerrar,
}: Args) {
  const [inicial] = useState<BorradorDeValor>(() =>
    original
      ? borradorDeValor(original)
      : { ...BORRADOR_NUEVO_DE_VALOR, orden: String(ordenSiguiente(valoresDelCatalogo)) },
  )
  const [valores, setValores] = useState<BorradorDeValor>(inicial)

  const envio = useEnvioDeModal({
    abierto,
    hayCambios: JSON.stringify(valores) !== JSON.stringify(inicial),
    validar: () => {
      const validado = validarValor(valores)
      return validado.ok ? null : validado.errores
    },
    pedir: async () => {
      const validado = validarValor(valores)
      if (!validado.ok) {
        return { ok: false, error: { codigo: 'validacion', mensaje: MENSAJE_DE_VALIDACION } }
      }
      const datos = validado.datos
      if (!original) {
        return enviarAccion(crearValor({ catalogo, ...datos }), MENSAJE_DE_VALIDACION)
      }
      const cambios = cambiosDeValor(original, datos)
      return cambios === null
        ? { ok: true as const, data: original }
        : enviarAccion(
            guardarValor({ id: original.id, nombre: original.nombre, cambios }),
            MENSAJE_DE_VALIDACION,
          )
    },
    alGuardar: () => {
      avisarExito('Valor guardado.')
      alCerrar()
    },
    campoDelRechazo: (error) => (error.codigo === 'duplicado' ? 'nombre' : null),
  })

  return {
    ...envio,
    valores,
    escribir: (cambios: Partial<BorradorDeValor>) => {
      setValores((antes) => ({ ...antes, ...cambios }))
      for (const clave of Object.keys(cambios)) {
        envio.quitarMotivo(clave)
      }
    },
  }
}
