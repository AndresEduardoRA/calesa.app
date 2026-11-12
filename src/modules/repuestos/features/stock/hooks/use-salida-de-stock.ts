'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { formatearNumero } from '@/shared/lib/formato'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import type { FilaDeStock } from '../../../entities/stock/listado'
import { validarMovimiento, validarNotaDeStock } from '../../../entities/stock/reglas'
import { moverStock } from '../actions/mover-stock'

export type MotivoDeSalida = 'vendido' | 'devuelto'
type Campo = 'cantidad' | 'nota'
type Args = { fila: FilaDeStock; motivo: MotivoDeSalida; alTerminar: () => void }

const MENSAJE_DE_VALIDACION = 'Revisa la cantidad y la nota.'
const vacio = { cantidad: '', nota: '' }

function exito(motivo: MotivoDeSalida, unidades: number): string {
  const n = formatearNumero(unidades)
  return motivo === 'vendido' ? `Vendiste ${n}.` : `Devolviste ${n} al proveedor.`
}

// «Vender suelto» y «Devolver al proveedor» de la vista «Stock» (8.10-3, C12): antes de enviar, lo que la base rechazaría seguro (cantidad desde 1 y no más de lo que hay,
// nota de hasta 500). El stock que se vio viaja como esperado: si cambió, `PT409` con «Recargar». Éxito: el panel se cierra y la página se relee (la lista es del servidor).
export function useSalidaDeStock({ fila, motivo, alTerminar }: Args) {
  const router = useRouter()
  const [valores, setValores] = useState(vacio)
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({})
  const [aviso, setAviso] = useState<string | null>(null)
  const [enCurso, setEnCurso] = useState(false)

  function antesDeEnviar(): { unidades: number; nota: string | null } | null {
    const unidades = Number(valores.cantidad.trim())
    const movimiento = validarMovimiento({
      motivo,
      cantidad: valores.cantidad.trim() === '' ? Number.NaN : unidades,
      stock: fila.stockCantidad,
      disponible: 0,
    })
    const nota = validarNotaDeStock(valores.nota)
    const nuevos: Partial<Record<Campo, string>> = {}
    if (!movimiento.ok) nuevos.cantidad = movimiento.error
    if (nota) nuevos.nota = nota.error
    setErrores(nuevos)
    if (Object.keys(nuevos).length > 0) return null
    const limpia = valores.nota.trim()
    return { unidades, nota: limpia === '' ? null : limpia }
  }

  async function enviar() {
    if (enCurso) return
    setAviso(null)
    const listo = antesDeEnviar()
    if (listo === null) return
    setEnCurso(true)
    const envio = await enviarAccion(
      moverStock({
        itemId: fila.id,
        motivo,
        unidades: listo.unidades,
        stockEsperado: fila.stockCantidad,
        nota: listo.nota,
      }),
      MENSAJE_DE_VALIDACION,
    )
    setEnCurso(false)
    if (envio.ok) {
      setValores(vacio)
      alTerminar()
      router.refresh()
      avisarExito(exito(motivo, listo.unidades))
      return
    }
    if ('sinRed' in envio) {
      setAviso(envio.error.mensaje)
      return
    }
    const porCampo = envio.porCampo ?? {}
    const deCampos: Partial<Record<Campo, string>> = {}
    if (porCampo['cantidad']) deCampos.cantidad = porCampo['cantidad']
    if (porCampo['nota']) deCampos.nota = porCampo['nota']
    if (Object.keys(deCampos).length > 0) {
      setErrores(deCampos)
    } else if (envio.error.codigo === 'conflicto') {
      avisarError(envio.error)
    } else {
      setAviso(envio.error.mensaje)
    }
  }

  return {
    valores,
    errores,
    aviso,
    enCurso,
    hayCambios: valores.cantidad.trim() !== '' || valores.nota.trim() !== '',
    escribir: (campo: Campo, texto: string) => {
      setValores((antes) => ({ ...antes, [campo]: texto }))
      setErrores((antes) => ({ ...antes, [campo]: undefined }))
    },
    vaciar: () => {
      setValores(vacio)
      setErrores({})
    },
    enviar,
  }
}
