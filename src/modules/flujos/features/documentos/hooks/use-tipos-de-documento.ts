'use client'

import { useState } from 'react'
import { avisarConDeshacer, avisarError, avisarExito } from '@/shared/ui/toasts'
import type { Movimiento } from '@/shared/ui/lista-de-catalogo/use-foco-tras-mover'
import type { CambiosDeTipo } from '../../../entities/documentos/formulario-de-tipo'
import {
  destinoDeTipo,
  textoDelUso,
  type ClaveDeGrupo,
  type DireccionDeTipo,
  type TipoDeDocumento,
} from '../../../entities/documentos/tipo-de-documento'
import {
  buscarTipo,
  firmaDelOrden,
  type VistasDeGrupos,
} from '../../../entities/documentos/vista-de-grupo'
import type { DatosParaCrear } from '../../../entities/documentos/formulario-de-tipo'
import { useEscrituraDeTipos } from './use-escritura-de-tipos'
import { usePedidosDeTipos } from './use-pedidos-de-tipos'

// Los tipos de documento de la pantalla: activar (con «Deshacer»), ordenar, eliminar y los dos del modal. Una escritura a la vez. La lista no
// viene en la respuesta: cada acción revalida la página y ésta trae los dos grupos releídos. Un conflicto o un tipo que ya no está se dicen y la
// página se vuelve a leer.
export function useTiposDeDocumento(vistas: VistasDeGrupos) {
  const escritura = useEscrituraDeTipos()
  const pedir = usePedidosDeTipos()
  // Lo que anuncia el lector de pantalla tras mover, y qué se movió (la pantalla devuelve el foco).
  const [anuncio, setAnuncio] = useState('')
  const [movimiento, setMovimiento] = useState<
    (Movimiento & { grupo: ClaveDeGrupo; firmaAntes: string }) | null
  >(null)

  // Activar o desactivar guarda solo, y es reversible: se ofrece «Deshacer» con la versión nueva (la respuesta la trae).
  async function activar(tipo: TipoDeDocumento, activo: boolean) {
    const envio = await escritura.mandar(() => pedir.guardar(tipo, { activo }))
    if (envio === null) {
      return
    }
    if (!envio.ok) {
      escritura.rechazar(envio)
      return
    }
    const quedo = { ...tipo, activo, actualizadoEn: envio.data.actualizadoEn }
    avisarConDeshacer(`«${tipo.nombre}» ${activo ? 'activado' : 'desactivado'}.`, () => {
      void activar(quedo, !activo)
    })
  }

  async function mover(tipo: TipoDeDocumento, direccion: DireccionDeTipo) {
    const grupo = buscarTipo(vistas, tipo.id)
    const destino = grupo && destinoDeTipo(grupo.vista.grupo.tipos, tipo.id, direccion)
    const envio = destino && (await escritura.mandar(() => pedir.mover(tipo, destino.despuesDe)))
    if (!envio) {
      return
    }
    if (!envio.ok) {
      escritura.rechazar(envio)
      return
    }
    setAnuncio(`«${tipo.nombre}» ${direccion === 'subir' ? 'subió' : 'bajó'} un lugar.`)
    setMovimiento((antes) => ({
      id: tipo.id,
      direccion,
      grupo: tipo.flujoId === null ? 'empresa' : 'flujo',
      firmaAntes: firmaDelOrden(grupo.vista.grupo.tipos),
      veces: (antes?.veces ?? 0) + 1,
    }))
  }

  // Sin uso se borra; si entre tanto llegó uno, la base lo desactiva y dice con qué lo usan.
  async function eliminar(tipo: TipoDeDocumento): Promise<boolean> {
    const envio = await escritura.mandar(() => pedir.eliminar(tipo))
    if (!envio?.ok) {
      if (envio) {
        escritura.rechazar(envio)
      }
      return false
    }
    if (envio.data.accion === 'eliminado') {
      avisarExito(`«${tipo.nombre}» eliminado.`)
      return true
    }
    avisarError({
      codigo: 'regla',
      mensaje: `No se pudo eliminar «${tipo.nombre}». ${textoDelUso(envio.data.uso)}. Quedó desactivado.`,
    })
    return true
  }

  return {
    anuncio,
    movimiento,
    enCurso: escritura.enCurso,
    // Los dos del modal devuelven el envío entero: el modal dice el motivo junto al campo.
    crear: (id: string, flujoId: string | null, datos: DatosParaCrear) =>
      escritura.mandar(() => pedir.crear(id, flujoId, datos)),
    guardar: (tipo: TipoDeDocumento, cambios: CambiosDeTipo) =>
      escritura.mandar(() => pedir.guardar(tipo, cambios)),
    activar,
    mover,
    eliminar,
    releer: escritura.releer,
  }
}

export type TiposDeDocumento = ReturnType<typeof useTiposDeDocumento>
