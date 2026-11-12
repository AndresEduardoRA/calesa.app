'use client'

import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { useState, useTransition } from 'react'
import { CLAVE_WIDGETS_DEL_TABLERO, guardarPreferencia } from '@/modules/equipo/client'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { Direccion } from '@/shared/ui/lista-de-catalogo/tipos'
import type { Movimiento } from '@/shared/ui/lista-de-catalogo/use-foco-tras-mover'
import { avisarError } from '@/shared/ui/toasts'
import { alternarOculto, aPreferencia, moverFila } from '../../../entities/personalizar'
import type { WidgetOfrecido } from './tipos'

// Las filas del panel y cómo se guardan: cada cambio guarda en el acto, con una sola petición en vuelo (así dos clics seguidos no se
// pisan). Si falla, la lista queda como estaba y se avisa. Al volver bien, `router.refresh()` redibuja el tablero
// y los controles siguen apagados hasta que termina.
export function useGuardarDisposicion(
  ofrecidos: readonly WidgetOfrecido[],
  hayPreferencia: boolean,
  ordenDeFabrica: readonly string[],
) {
  const router = useRouter()
  const [redibujando, redibujar] = useTransition()
  const { executeAsync } = useAction(guardarPreferencia)
  const [filas, fijarFilas] = useState(ofrecidos)
  const [conPreferencia, fijarConPreferencia] = useState(hayPreferencia)
  const [enviando, fijarEnviando] = useState(false)
  const [aviso, fijarAviso] = useState('')
  const [movimiento, fijarMovimiento] = useState<Movimiento | null>(null)

  async function guardar(
    nuevas: readonly WidgetOfrecido[] | null,
    siguientes: readonly WidgetOfrecido[],
    movido?: { id: string; direccion: Direccion },
  ) {
    fijarEnviando(true)
    fijarAviso('')
    const envio = await enviarAccion(
      executeAsync({
        clave: CLAVE_WIDGETS_DEL_TABLERO,
        valor: nuevas ? aPreferencia(nuevas) : null,
      }),
      'No se pudo guardar tu preferencia.',
    )
    fijarEnviando(false)
    if (!envio.ok) {
      avisarError(envio.error)
      return
    }
    fijarFilas(siguientes)
    fijarConPreferencia(nuevas !== null)
    fijarAviso('Guardado')
    if (movido) {
      fijarMovimiento((anterior) => ({ ...movido, veces: (anterior?.veces ?? 0) + 1 }))
    }
    redibujar(() => {
      router.refresh()
    })
  }

  return {
    filas,
    conPreferencia,
    // Hasta que el tablero se redibuja con lo guardado: cerrar el panel antes cambia la URL y el redibujo en vuelo se pierde.
    guardando: enviando || redibujando,
    aviso,
    movimiento,
    mover(clave: string, direccion: Direccion) {
      const nuevas = moverFila(filas, clave, direccion)
      void guardar(nuevas, nuevas, { id: clave, direccion })
    },
    alternar(clave: string) {
      const nuevas = alternarOculto(filas, clave)
      void guardar(nuevas, nuevas)
    },
    // De vuelta al orden del catálogo y todo visible.
    restablecer() {
      const deFabrica = ordenDeFabrica.flatMap((clave) => {
        const fila = filas.find((otra) => otra.clave === clave)
        return fila ? [{ ...fila, oculto: false }] : []
      })
      void guardar(null, deFabrica)
    },
  }
}
