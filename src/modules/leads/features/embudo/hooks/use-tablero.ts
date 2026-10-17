'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { TAMANO_DE_COLUMNA } from '@/shared/lib/paginacion'
import { avisarError } from '@/shared/ui/toasts'
import { leerPaginaDeEtapa } from '../../../composicion.client'
import {
  conMovida,
  conPagina,
  cursorDeColumna,
  firmaDelTablero,
  type Tablero,
  type Tarjeta,
} from '../../../entities/tablero'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { moverOportunidad } from '../../oportunidades/actions/mover-oportunidad'

// El kanban en la pantalla. Se siembra con lo que trajo el servidor y lo vuelve a sembrar cuando
// cambia (otro embudo, `router.refresh()`). «Mover a…» se ve enseguida en la otra columna y, si la
// base lo rechaza, vuelve a donde estaba y se dice por qué (un conflicto ofrece «Recargar»).
export function useTablero(inicial: Tablero) {
  const firma = firmaDelTablero(inicial)
  const [vista, setVista] = useState(firma)
  const [tablero, setTablero] = useState(inicial)
  if (vista !== firma) {
    setVista(firma)
    setTablero(inicial)
  }
  const mover = useAction(moverOportunidad)
  // La tarjeta que viaja: su menú no acepta otro pedido mientras tanto.
  const [moviendo, setMoviendo] = useState<string | null>(null)
  const [cargando, setCargando] = useState<string | null>(null)
  // Lo que se anuncia a un lector de pantalla después de mover («pasó a Cotizado»).
  const [anuncio, setAnuncio] = useState('')

  async function moverA(
    tarjeta: Tarjeta,
    etapaId: string,
    motivo: string | null,
  ): Promise<boolean> {
    const destino = tablero.columnas.find((c) => c.etapa.id === etapaId)?.etapa
    if (!destino || tarjeta.etapaId === etapaId) {
      return false
    }
    const antes = tablero
    setMoviendo(tarjeta.id)
    setTablero((t) =>
      conMovida(t, tarjeta.id, etapaId, destino.esPerdida ? { motivoPerdida: motivo } : {}),
    )
    const envio = await enviarAccion(
      mover.executeAsync({
        id: tarjeta.id,
        etapaEsperada: tarjeta.etapaId,
        etapa: etapaId,
        motivoPerdida: motivo,
      }),
      MENSAJE_DE_VALIDACION,
    )
    setMoviendo(null)
    if (!envio.ok) {
      setTablero(antes)
      avisarError(envio.error)
      return false
    }
    const { oportunidad } = envio.data
    setTablero((t) =>
      conMovida(t, tarjeta.id, oportunidad.etapaId, {
        estado: oportunidad.estado,
        motivoPerdida: oportunidad.motivoPerdida,
        enEtapaDesde: oportunidad.enEtapaDesde,
        actualizadoEn: oportunidad.actualizadoEn,
      }),
    )
    setAnuncio(`«${tarjeta.titulo}» pasó a «${destino.nombre}».`)
    return true
  }

  async function verMas(etapaId: string) {
    const columna = tablero.columnas.find((c) => c.etapa.id === etapaId)
    const antes = columna ? cursorDeColumna(columna) : null
    if (!antes) {
      return
    }
    setCargando(etapaId)
    const { busqueda } = tablero
    const embudoId = tablero.embudo.id
    const pagina = await leerPaginaDeEtapa({
      etapaId,
      antes,
      tope: TAMANO_DE_COLUMNA,
      buscar: busqueda,
    })
    setCargando(null)
    if (!pagina.ok) {
      avisarError(pagina.error)
      return
    }
    // Si mientras tanto cambió la búsqueda o el embudo, esta página es de otro tablero: se descarta.
    setTablero((t) =>
      t.busqueda === busqueda && t.embudo.id === embudoId ? conPagina(t, etapaId, pagina.data) : t,
    )
  }

  return { tablero, moverA, verMas, moviendo, cargando, anuncio }
}

export type EstadoDelTablero = ReturnType<typeof useTablero>
