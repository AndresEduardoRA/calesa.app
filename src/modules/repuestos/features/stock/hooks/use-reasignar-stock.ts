'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { enviarAccion, type Envio } from '@/shared/lib/enviar-accion'
import { formatearNumero } from '@/shared/lib/formato'
import { RUTAS } from '@/shared/lib/rutas'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import type { FilaDeStock } from '../../../entities/stock/listado'
import { validarReasignacion } from '../../../entities/stock/reglas'
import { reasignarStock } from '../actions/reasignar-stock'

export type ProyectoElegido = { id: string; titulo: string }
type Campo = 'proyecto' | 'cantidad'
type Args = { fila: FilaDeStock; alTerminar: () => void }

const MENSAJE_DE_VALIDACION = 'Revisa el proyecto destino y la cantidad.'
const SIN_DESTINO = 'Elige el proyecto destino.'

// El número del elegido, para el aviso: su título empieza por «#N · ».
function numeroDelTitulo(titulo: string): string {
  return /^#(\d+)/.exec(titulo)?.[1] ?? ''
}

// Un fallo va junto a su campo (proyecto o cantidad); un conflicto sin campo, al toast con «Recargar»; lo demás (sin red, el `id` en uso: «Cierra el formulario y vuelve
// a abrirlo»), arriba del formulario.
function queHacerConElFallo(envio: Exclude<Envio<unknown>, { ok: true }>): {
  campos?: Partial<Record<Campo, string>>
  aviso?: string
} {
  if ('sinRed' in envio) return { aviso: envio.error.mensaje }
  const porCampo = envio.porCampo ?? {}
  const campos: Partial<Record<Campo, string>> = {}
  if (porCampo['proyecto']) campos.proyecto = porCampo['proyecto']
  if (porCampo['cantidad']) campos.cantidad = porCampo['cantidad']
  if (Object.keys(campos).length > 0) return { campos }
  return envio.error.codigo === 'conflicto' ? {} : { aviso: envio.error.mensaje }
}

// «Reasignaste N al proyecto #M.» con «Ver proyecto», que lleva a la hoja del destino.
function avisarReasignado(unidades: number, titulo: string, verProyecto: () => void) {
  avisarExito(`Reasignaste ${formatearNumero(unidades)} al proyecto #${numeroDelTitulo(titulo)}.`, {
    etiqueta: 'Ver proyecto',
    sale: true,
    alHacer: verProyecto,
  })
}

// «Reasignar a un proyecto» de la vista «Stock» (8.10-3, C13): proyecto destino (abierto, distinto del de origen: el buscador ya los excluye) y cantidad (desde 1 y no
// más de lo que hay). El `id` del ítem nuevo nace con el formulario (una apertura, un id: la `key` del formulario es la apertura) y se conserva en cada reintento: la RPC
// es idempotente por él. Éxito: el panel se cierra, la página se relee y el aviso lleva a la hoja del destino.
export function useReasignarStock({ fila, alTerminar }: Args) {
  const router = useRouter()
  const [id] = useState(() => crypto.randomUUID())
  const [destino, setDestino] = useState<ProyectoElegido | null>(null)
  const [cantidad, setCantidad] = useState('')
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({})
  const [aviso, setAviso] = useState<string | null>(null)
  const [enCurso, setEnCurso] = useState(false)

  function antesDeEnviar(): { destino: ProyectoElegido; unidades: number } | null {
    const unidades = Number(cantidad.trim())
    const regla = validarReasignacion({
      cantidad: cantidad.trim() === '' ? Number.NaN : unidades,
      stock: fila.stockCantidad,
      mismoProyecto: destino?.id === fila.proyectoId,
      destinoCerrado: false,
    })
    const nuevos: Partial<Record<Campo, string>> = {}
    if (destino === null) nuevos.proyecto = SIN_DESTINO
    if (!regla.ok) nuevos[regla.campo === 'proyecto' ? 'proyecto' : 'cantidad'] = regla.error
    setErrores(nuevos)
    return destino === null || Object.keys(nuevos).length > 0 ? null : { destino, unidades }
  }

  async function enviar() {
    if (enCurso) return
    setAviso(null)
    const listo = antesDeEnviar()
    if (listo === null) return
    setEnCurso(true)
    const envio = await enviarAccion(
      reasignarStock({
        itemId: fila.id,
        proyectoDestinoId: listo.destino.id,
        unidades: listo.unidades,
        id,
      }),
      MENSAJE_DE_VALIDACION,
    )
    setEnCurso(false)
    if (envio.ok) {
      alTerminar()
      router.refresh()
      avisarReasignado(listo.unidades, listo.destino.titulo, () => {
        router.push(`${RUTAS.repuestos}/${envio.data.proyectoId}` as Route)
      })
      return
    }
    const fallo = queHacerConElFallo(envio)
    if (fallo.campos) setErrores(fallo.campos)
    else if (fallo.aviso) setAviso(fallo.aviso)
    else avisarError(envio.error)
  }

  return {
    destino,
    cantidad,
    errores,
    aviso,
    enCurso,
    hayCambios: destino !== null || cantidad.trim() !== '',
    elegir: (elegido: ProyectoElegido | null) => {
      setDestino(elegido)
      setErrores((antes) => ({ ...antes, proyecto: undefined }))
    },
    escribirCantidad: (texto: string) => {
      setCantidad(texto)
      setErrores((antes) => ({ ...antes, cantidad: undefined }))
    },
    vaciar: () => {
      setDestino(null)
      setCantidad('')
      setErrores({})
    },
    enviar,
  }
}
