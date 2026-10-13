'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState, type Dispatch } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import { subirFoto } from '../../../composicion.client'
import type { FotoSubida } from '../../../entities/foto'
import { mensajeDeRechazo, resumenDeSubida } from '../../../entities/seleccion-de-fotos'
import { agregarFotos } from '../actions/agregar-fotos'
import type { AccionDeBandeja, ItemVisto } from '../bandeja'
import { respuestaDe } from '../envio'
import { enTandas } from '../tandas'

const SUBIDAS_A_LA_VEZ = 3
const NO_SUBIO = 'No se pudo subir.'
const NO_SE_GUARDO = 'Se subió, pero no se pudo guardar.'

type Subida = { clave: string; subida: FotoSubida }

// Lo que la base dijo que no (permiso, vehículo que ya no está): se muestra tal cual. Una caída
// de red no: ahí el resumen ya dice que se reintente.
const loDijoLaBase = (error: ErrorApp) => error.codigo !== 'inesperado'

// Confirmar la bandeja: sube los dos objetos de cada foto (de a tres) y después registra, en una
// sola llamada y en el orden elegido, las que subieron. Lo que falla queda en la bandeja para
// reintentarlo: lo ya subido no se vuelve a subir y registrar es idempotente por hash.
export function useSubidaDeFotos(vehiculoId: string, despachar: Dispatch<AccionDeBandeja>) {
  const { executeAsync } = useAction(agregarFotos)
  const [progreso, setProgreso] = useState<{ hechas: number; total: number } | null>(null)

  async function subirSusObjetos(item: ItemVisto): Promise<FotoSubida | null> {
    if (!item.preparada) {
      return null
    }
    const resultado = await subirFoto(vehiculoId, item.preparada)
    return resultado.ok ? resultado.data : null
  }

  async function subirUna(item: ItemVisto): Promise<Subida | null> {
    // Lo que ya subió en un intento anterior no se vuelve a subir.
    const subida = item.subida ?? (await subirSusObjetos(item))
    setProgreso((antes) => (antes ? { ...antes, hechas: antes.hechas + 1 } : antes))
    if (!subida) {
      despachar({ tipo: 'fallida', claves: [item.clave], motivo: NO_SUBIO })
      return null
    }
    despachar({ tipo: 'subida', clave: item.clave, subida })
    return { clave: item.clave, subida }
  }

  // Cuántas quedaron guardadas.
  async function registrar(subidas: readonly Subida[]): Promise<number> {
    if (subidas.length === 0) {
      return 0
    }
    const claves = subidas.map((una) => una.clave)
    const resultado = await respuestaDe(
      executeAsync({ vehiculoId, fotos: subidas.map((una) => una.subida) }),
    )
    if (!resultado.ok) {
      const dicho = loDijoLaBase(resultado.error)
      despachar({
        tipo: 'fallida',
        claves,
        motivo: dicho ? resultado.error.mensaje : NO_SE_GUARDO,
      })
      if (dicho) {
        avisarError(resultado.error)
      }
      return 0
    }
    const { agregadas, repetidas, sinLugar } = resultado.data
    // Las que no entraron por el tope (alguien sumó fotos mientras tanto) se quedan, con su motivo.
    const sinSitio = subidas.filter((una) => sinLugar.includes(una.subida.hash))
    if (sinSitio.length > 0) {
      despachar({
        tipo: 'fallida',
        claves: sinSitio.map((una) => una.clave),
        motivo: mensajeDeRechazo('sin_lugar'),
      })
    }
    despachar({ tipo: 'guardadas', hashes: [...agregadas, ...repetidas] })
    return agregadas.length + repetidas.length
  }

  async function subir(items: readonly ItemVisto[]) {
    if (items.length === 0 || progreso !== null) {
      return
    }
    setProgreso({ hechas: 0, total: items.length })
    despachar({ tipo: 'subiendo', claves: items.map((item) => item.clave) })
    const subidas = await enTandas(items, SUBIDAS_A_LA_VEZ, subirUna)
    const guardadas = await registrar(subidas.filter((una) => una !== null))
    setProgreso(null)
    const resumen = resumenDeSubida({ guardadas, fallidas: items.length - guardadas })
    if (guardadas === items.length) {
      avisarExito(resumen)
    } else {
      avisarError({ codigo: 'inesperado', mensaje: resumen })
    }
  }

  return { subir, enCurso: progreso !== null, progreso }
}
