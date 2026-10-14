'use client'

import { useAction } from 'next-safe-action/hooks'
import { descargarFoto, prepararFoto, subirFoto } from '../../../composicion.client'
import { mensajeDeApibara, type CodigoDeApibara } from '../../../entities/apibara'
import type { FotoSubida } from '../../../entities/foto'
import {
  fotosQueFaltan,
  resumenDeFotosDeSubasta,
  type FotoDeSubasta,
  type ResultadoDeFotos,
} from '../../../entities/subasta-fotos'
import { avisarError, avisarExito, avisarProgreso, terminarProgreso } from '@/shared/ui/toasts'
import { agregarFotos } from '../../fotos/actions/agregar-fotos'
import { respuestaDe } from '../../fotos/envio'
import { enTandas } from '../../fotos/tandas'
import { cortaLaCola } from '../lineas'

// Bajar y subir una foto son dos viajes: de a tres no ahoga una conexión de celular.
const FOTOS_A_LA_VEZ = 3

type Traida =
  | { ok: true; foto: FotoDeSubasta; subida: FotoSubida }
  | { ok: false; codigo: CodigoDeApibara | null }

type Pedido = {
  vehiculoId: string
  // La respuesta de apibara en bruto: de ahí salen las direcciones de las fotos.
  raw: unknown
  // Las direcciones de origen que el vehículo ya tiene registradas (para traer sólo las que faltan).
  registradas?: readonly string[]
  // El aviso que se actualiza mientras corre; con varios vehículos, cada uno el suyo.
  idDeAviso?: string
  // Qué vehículo es, para el mensaje (opcional).
  nombre?: string
}

// Trae las fotos de la subasta: las baja por la edge function (que tiene la clave), les saca los
// dos tamaños y las sube por la misma tubería que las fotos que elige la persona, y las registra
// en una sola llamada. Sigue aunque se cierre el panel: el aviso es de la pantalla, no del panel.
// El vehículo ya está guardado: lo que falla se puede traer después desde Fotos.
export function useFotosDeSubasta(origenId: string) {
  const { executeAsync } = useAction(agregarFotos)

  async function traerUna(vehiculoId: string, foto: FotoDeSubasta): Promise<Traida> {
    const archivo = await descargarFoto(origenId, foto.url, `subasta-${String(foto.orden)}`)
    if (!archivo.ok) {
      return { ok: false, codigo: archivo.error.codigo }
    }
    const preparada = await prepararFoto(archivo.data)
    if (!preparada.ok) {
      return { ok: false, codigo: null }
    }
    const subida = await subirFoto(vehiculoId, preparada.data)
    return subida.ok ? { ok: true, foto, subida: subida.data } : { ok: false, codigo: null }
  }

  async function traer(pedido: Pedido): Promise<ResultadoDeFotos> {
    const { vehiculoId, raw, registradas = [], idDeAviso = `fotos-${pedido.vehiculoId}` } = pedido
    const faltan = fotosQueFaltan(raw, registradas)
    if (faltan.length === 0) {
      return { total: 0, guardadas: 0 }
    }
    const donde = pedido.nombre ? ` de ${pedido.nombre}` : ''
    let hechas = 0
    let corte: CodigoDeApibara | null = null
    avisarProgreso(idDeAviso, `Trayendo las fotos${donde}: 0 de ${String(faltan.length)}`)
    const traidas = await enTandas(faltan, FOTOS_A_LA_VEZ, async (foto): Promise<Traida> => {
      // Con la cuota agotada o la clave rechazada, las demás fallarían igual.
      const resultado: Traida = corte
        ? { ok: false, codigo: corte }
        : await traerUna(vehiculoId, foto)
      if (!resultado.ok && resultado.codigo && cortaLaCola(resultado.codigo)) {
        corte = resultado.codigo
      }
      hechas += 1
      avisarProgreso(
        idDeAviso,
        `Trayendo las fotos${donde}: ${String(hechas)} de ${String(faltan.length)}`,
      )
      return resultado
    })

    const subidas = traidas.flatMap((una) => (una.ok ? [una] : []))
    const motivo = traidas.find((una) => !una.ok && una.codigo !== null)
    const porQue =
      motivo && !motivo.ok && motivo.codigo ? mensajeDeApibara(motivo.codigo) : undefined
    let guardadas = 0
    if (subidas.length > 0) {
      const sinFotos = registradas.length === 0
      const respuesta = await respuestaDe(
        executeAsync({
          vehiculoId,
          fotos: subidas.map(({ foto, subida }) => ({
            ...subida,
            origenUrl: foto.url,
            orden: foto.orden,
            // La primera de la lista es la portada, pero sólo si el vehículo no tenía fotos: si
            // la persona ya eligió otra, traer las que faltan no se la quita.
            ...(sinFotos && foto.orden === 1 ? { esPortada: true } : {}),
          })),
        }),
      )
      guardadas = respuesta.ok
        ? respuesta.data.agregadas.length + respuesta.data.repetidas.length
        : 0
    }
    terminarProgreso(idDeAviso)
    const resultado: ResultadoDeFotos = {
      total: faltan.length,
      guardadas,
      ...(porQue ? { motivo: porQue } : {}),
    }
    const mensaje = resumenDeFotosDeSubasta(resultado)
    if (guardadas === faltan.length) {
      avisarExito(mensaje)
    } else {
      avisarError({ codigo: 'inesperado', mensaje })
    }
    return resultado
  }

  return { traer }
}
