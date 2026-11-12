'use client'

import { useState } from 'react'
import { enviarAccion, type Envio } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import type { FilaDeCompra } from '../../../entities/compras/compra'
import {
  cambiosDeCompra,
  datosDeCompra,
  type DatosDeCompra,
} from '../../../entities/compras/formulario'
import type { CompraGuardada } from '../../../entities/compras/repositorio'
import { guardarCompra } from '../actions/guardar-compra'

type Args = {
  proyectoId: string
  // Nula = «Registrar compra».
  original: FilaDeCompra | null
  // El id del intento de alta: se conserva en cada reintento, así reenviar no duplica (D3 de 8.11-1).
  intento: string
  abierto: boolean
  alCerrar: () => void
  // Se guardó: tira el borrador.
  alGuardar: () => void
  // La base rechazó campos concretos: el motivo junto a cada uno.
  alRechazarCampos: (porCampo: Record<string, string>) => void
}

const MENSAJE_DE_VALIDACION = 'Revisa los datos de la compra.'

// El envío de una compra (8.11-3, C11): registrar o editar por `guardarCompra`. La lista y el margen llegan por la revalidación de la action, sin `router.refresh()`.
// Un conflicto (`PT409`) espera «Recargar»; sin conexión lo escrito queda pendiente y sale solo al volver la red; un rechazo de la base va por campo o arriba.
export function useEnvioDeCompra(args: Args) {
  const { proyectoId, original, intento, abierto, alCerrar, alGuardar, alRechazarCampos } = args
  const [aviso, setAviso] = useState<string | null>(null)
  const [conflicto, setConflicto] = useState<string | null>(null)
  const [pendiente, setPendiente] = useState<DatosDeCompra | null>(null)
  const [enCurso, setEnCurso] = useState(false)

  function alRechazar(envio: Extract<Envio<CompraGuardada>, { ok: false }>) {
    setPendiente(null)
    if (envio.error.codigo === 'conflicto') {
      setConflicto(envio.error.mensaje)
    } else if ('porCampo' in envio && envio.porCampo && Object.keys(envio.porCampo).length > 0) {
      alRechazarCampos(envio.porCampo)
    } else {
      setAviso(envio.error.mensaje)
    }
  }

  async function pedir(datos: DatosDeCompra): Promise<Envio<CompraGuardada> | null> {
    const claves = original ? cambiosDeCompra(original, datos) : datosDeCompra(datos)
    if (claves === null) return null
    return enviarAccion(
      guardarCompra({
        id: original?.id ?? intento,
        proyectoId,
        actualizadoEnEsperado: original?.actualizadoEn ?? null,
        datos: claves,
      }),
      MENSAJE_DE_VALIDACION,
    )
  }

  async function mandar(datos: DatosDeCompra): Promise<boolean> {
    setAviso(null)
    setEnCurso(true)
    const envio = await pedir(datos)
    setEnCurso(false)
    if (envio === null) {
      // Sin diferencia no hay nada que guardar: se cierra.
      alCerrar()
      return true
    }
    if (envio.ok) {
      alGuardar()
      setPendiente(null)
      avisarExito(original ? 'Compra guardada.' : 'Compra registrada.')
      alCerrar()
      return true
    }
    if ('sinRed' in envio) {
      setPendiente(datos)
    } else {
      alRechazar(envio)
    }
    return false
  }

  const enLinea = useReintentoAlVolver(abierto ? pendiente : null, mandar)

  return { mandar, aviso, conflicto, enCurso, enLinea, esperandoConexion: pendiente !== null }
}
