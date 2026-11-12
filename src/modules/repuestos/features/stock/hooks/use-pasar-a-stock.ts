'use client'

import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { formatearNumero } from '@/shared/lib/formato'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import type { FilaDeItem } from '../../../entities/nucleo/item'
import { filaTrasMover } from '../../../entities/stock/mover'
import { validarMovimiento, validarNotaDeStock } from '../../../entities/stock/reglas'
import { moverStock } from '../actions/mover-stock'

type Campo = 'cantidad' | 'nota'
type Args = {
  item: FilaDeItem
  cambiarFila: (id: string, cambio: (fila: FilaDeItem) => FilaDeItem) => void
  alPasar: () => void
}

const MENSAJE_DE_VALIDACION = 'Revisa la cantidad y la nota.'
const vacio = { cantidad: '', nota: '' }

// «Pasar a stock» (8.10-2, C12): antes de enviar, lo que la base rechazaría seguro (cantidad desde 1 y no más que la del ítem, nota de hasta 500; el tope exacto de lo que
// ya entró lo dice la base, D7). Éxito: la fila vigente toma el stock y la versión de la respuesta, el formulario se vacía y el historial se relee. Fallo: los valores quedan;
// el motivo junto a su campo, un conflicto con «Recargar» y lo demás arriba del formulario.
export function usePasarAStock({ item, cambiarFila, alPasar }: Args) {
  const [valores, setValores] = useState(vacio)
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({})
  const [aviso, setAviso] = useState<string | null>(null)
  const [enCurso, setEnCurso] = useState(false)

  function antesDeEnviar(): { unidades: number; nota: string | null } | null {
    const unidades = Number(valores.cantidad.trim())
    const movimiento = validarMovimiento({
      motivo: 'sobrante',
      cantidad: valores.cantidad.trim() === '' ? Number.NaN : unidades,
      stock: item.stockCantidad,
      disponible: item.cantidad,
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
        itemId: item.id,
        motivo: 'sobrante',
        unidades: listo.unidades,
        stockEsperado: item.stockCantidad,
        nota: listo.nota,
      }),
      MENSAJE_DE_VALIDACION,
    )
    setEnCurso(false)
    if (envio.ok) {
      cambiarFila(item.id, (fila) => filaTrasMover(fila, envio.data))
      setValores(vacio)
      alPasar()
      avisarExito(`Pasaste ${formatearNumero(listo.unidades)} a stock.`)
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
