'use client'

import { useAction } from 'next-safe-action/hooks'
import { descargarFoto, prepararFoto, subirFoto } from '../../../composicion.client'
import { mensajeDeApibara, type CodigoDeApibara } from '../../../entities/apibara'
import type { FotoSubida } from '../../../entities/foto'
import type { FotosAgregadas } from '../../../entities/repositorios'
import type { Resultado } from '@/shared/lib/errores'
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
  // El aviso que se actualiza mientras corre; con varios vehículos, cada uno el suyo.
  idDeAviso?: string
  // Qué vehículo es, para el mensaje (opcional).
  nombre?: string
  // El vehículo no tiene ninguna foto: la primera de la lista queda de portada. Si ya tiene, traer
  // las que faltan no le quita la portada que la persona eligió.
  sinFotos?: boolean
} & (
  | {
      // La respuesta de apibara en bruto: de ahí salen las direcciones de las fotos, menos las que
      // el vehículo ya tiene registradas.
      raw: unknown
      registradas?: readonly string[]
    }
  | {
      // Las que faltan, ya calculadas por el servidor (la ficha no tiene el bruto).
      fotas: readonly FotoDeSubasta[]
    }
)

// Qué fotos hay que traer: las que dice el pedido, o las de la respuesta menos las ya registradas.
function fotasDe(pedido: Pedido): readonly FotoDeSubasta[] {
  return 'fotas' in pedido ? pedido.fotas : fotosQueFaltan(pedido.raw, pedido.registradas ?? [])
}

// Si el vehículo no tiene ninguna foto, la primera de la lista queda de portada. Si ya tiene,
// traer las que faltan no le quita la que la persona eligió.
function seQuedaSinFotos(pedido: Pedido): boolean {
  return pedido.sinFotos ?? ('raw' in pedido && (pedido.registradas ?? []).length === 0)
}

// Por qué no se trajeron las que faltan, dicho con las palabras de apibara; undefined si fue otra
// cosa (una imagen que no se pudo leer).
function motivoDeLasFallidas(traidas: readonly Traida[]): string | undefined {
  const fallida = traidas.find((una) => !una.ok && una.codigo !== null)
  return fallida && !fallida.ok && fallida.codigo ? mensajeDeApibara(fallida.codigo) : undefined
}

type FotoPorRegistrar = FotoSubida & { origenUrl: string; orden: number; esPortada?: boolean }

// Registra en una sola llamada las que subieron; devuelve cuántas quedaron guardadas.
async function registrar(
  guardar: (fotos: FotoPorRegistrar[]) => Promise<Resultado<FotosAgregadas>>,
  pedido: Pedido,
  subidas: readonly Extract<Traida, { ok: true }>[],
): Promise<number> {
  if (subidas.length === 0) {
    return 0
  }
  const sinFotos = seQuedaSinFotos(pedido)
  const respuesta = await guardar(
    subidas.map(({ foto, subida }) => ({
      ...subida,
      origenUrl: foto.url,
      orden: foto.orden,
      ...(sinFotos && foto.orden === 1 ? { esPortada: true } : {}),
    })),
  )
  return respuesta.ok ? respuesta.data.agregadas.length + respuesta.data.repetidas.length : 0
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
    const { vehiculoId, idDeAviso = `fotos-${pedido.vehiculoId}` } = pedido
    const faltan = fotasDe(pedido)
    if (faltan.length === 0) {
      return { total: 0, guardadas: 0 }
    }
    const donde = pedido.nombre ? ` de ${pedido.nombre}` : ''
    const avance = (hechas: number) =>
      `Trayendo las fotos${donde}: ${String(hechas)} de ${String(faltan.length)}`
    let hechas = 0
    let corte: CodigoDeApibara | null = null
    avisarProgreso(idDeAviso, avance(0))
    const traidas = await enTandas(faltan, FOTOS_A_LA_VEZ, async (foto): Promise<Traida> => {
      // Con la cuota agotada o la clave rechazada, las demás fallarían igual.
      const resultado: Traida = corte
        ? { ok: false, codigo: corte }
        : await traerUna(vehiculoId, foto)
      if (!resultado.ok && resultado.codigo && cortaLaCola(resultado.codigo)) {
        corte = resultado.codigo
      }
      hechas += 1
      avisarProgreso(idDeAviso, avance(hechas))
      return resultado
    })

    const guardadas = await registrar(
      (fotos) => respuestaDe(executeAsync({ vehiculoId, fotos })),
      pedido,
      traidas.filter((una) => una.ok),
    )
    terminarProgreso(idDeAviso)
    const motivo = motivoDeLasFallidas(traidas)
    const resultado: ResultadoDeFotos = {
      total: faltan.length,
      guardadas,
      ...(motivo ? { motivo } : {}),
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
