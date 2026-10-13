'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { avisar, avisarConDeshacer } from '@/shared/ui/toasts'
import {
  destinoDeMovimiento,
  type Direccion,
  type Foto,
  type FotoEliminada,
  type Galeria,
} from '../../../entities/foto'
import { mensajeDeRechazo } from '../../../entities/seleccion-de-fotos'
import { eliminarFoto } from '../actions/eliminar-foto'
import { fijarPortada } from '../actions/fijar-portada'
import { moverFoto } from '../actions/mover-foto'
import { restaurarFoto } from '../actions/restaurar-foto'
import { respuestaDe } from '../envio'
import { useVersionDeFotos } from './use-version-de-fotos'

// Qué foto recibe el foco al volver a dibujarse (la que se acaba de mover) y por qué botón.
export type FocoDeGaleria = { id: string; direccion: Direccion } | null

// Las ediciones de las fotos ya guardadas. Cada una manda la versión de las fotos: si otra
// persona las cambió, la base responde con quién y cuándo, y acá se ofrece recargar.
export function useGaleria(vehiculoId: string, galeria: Galeria) {
  const moviendo = useAction(moverFoto)
  const fijando = useAction(fijarPortada)
  const eliminando = useAction(eliminarFoto)
  const restaurando = useAction(restaurarFoto)
  const { vigente, cerrar, anuncio } = useVersionDeFotos(galeria.version)
  const [foco, setFoco] = useState<FocoDeGaleria>(null)

  async function mover(foto: Foto, direccion: Direccion) {
    const destino = destinoDeMovimiento(galeria.fotos, foto.id, direccion)
    const actualizadoEnEsperado = vigente()
    if (!destino || !actualizadoEnEsperado) {
      return
    }
    const pedido = { vehiculoId, actualizadoEnEsperado, fotoId: foto.id, ...destino }
    const resultado = await respuestaDe(moviendo.executeAsync(pedido))
    const lugar = foto.orden + (direccion === 'antes' ? -1 : 1)
    if (cerrar(resultado, `Foto movida al lugar ${lugar} de ${galeria.fotos.length}`)) {
      setFoco({ id: foto.id, direccion })
    }
  }

  async function ponerDePortada(foto: Foto) {
    const actualizadoEnEsperado = vigente()
    if (!actualizadoEnEsperado) {
      return
    }
    const pedido = { vehiculoId, actualizadoEnEsperado, fotoId: foto.id }
    cerrar(await respuestaDe(fijando.executeAsync(pedido)), `La foto ${foto.orden} es la portada`)
  }

  async function restaurar(foto: FotoEliminada) {
    const resultado = await respuestaDe(restaurando.executeAsync({ vehiculoId, foto }))
    // Mientras tanto alguien llenó el lugar que dejó.
    if (cerrar(resultado, 'Foto restaurada') && resultado.ok && resultado.data.sinLugar.length) {
      avisar(`No se pudo restaurar. ${mensajeDeRechazo('sin_lugar')}`)
    }
  }

  // Reversible: se hace y se ofrece «Deshacer». Los objetos siguen en Storage (la limpieza espera
  // 24 h), así que deshacer es volver a registrar la misma foto en su lugar.
  async function eliminar(foto: Foto): Promise<boolean> {
    const actualizadoEnEsperado = vigente()
    if (!actualizadoEnEsperado) {
      return false
    }
    const pedido = { vehiculoId, actualizadoEnEsperado, fotoId: foto.id }
    const resultado = await respuestaDe(eliminando.executeAsync(pedido))
    if (!cerrar(resultado, `Foto ${foto.orden} eliminada`) || !resultado.ok) {
      return false
    }
    const eliminada = resultado.data.foto
    if (eliminada) {
      avisarConDeshacer('Foto eliminada', () => {
        void restaurar(eliminada)
      })
    }
    return true
  }

  return {
    mover,
    ponerDePortada,
    eliminar,
    anuncio,
    foco,
    enCurso:
      moviendo.isPending || fijando.isPending || eliminando.isPending || restaurando.isPending,
  }
}
