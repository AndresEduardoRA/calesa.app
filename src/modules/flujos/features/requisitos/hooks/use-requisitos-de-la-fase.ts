'use client'

import { useMemo, useState } from 'react'
import type { Envio } from '@/shared/lib/enviar-accion'
import type { Movimiento } from '@/shared/ui/lista-de-catalogo/use-foco-tras-mover'
import { avisarExito } from '@/shared/ui/toasts'
import type { FaseParaConfigurar, FlujoParaConfigurar } from '../../../entities/flujo'
import { descripcionDeRequisito } from '../../../entities/requisitos/descripcion'
import type { DatosDeDato } from '../../../entities/requisitos/formulario-de-dato'
import type { VersionNueva } from '../../../entities/requisitos/respuestas'
import {
  destinoDeRequisito,
  firmaDelOrden,
  requisitosDeLaFase,
  type DireccionDeRequisito,
} from '../../../entities/requisitos/vista-de-fase'
import type { RequisitoParaConfigurar } from '../../../entities/flujo'
import { useVersionDelFlujo } from '../../configuracion/hooks/use-version-del-flujo'
import { pedidosDeRequisitos } from './pedidos-de-requisitos'
import { useEscrituraDeRequisitos } from './use-escritura-de-requisitos'
import { useOpcionesDeRequisitos } from './use-opciones-de-requisitos'

// Los requisitos de una fase y lo que se les hace: ordenar, quitar y agregar uno de dato. Una escritura a la vez; cada una manda la versión del flujo que se
// tiene en pantalla. La lista no viene en la respuesta: la action revalida y la página trae el flujo releído. Tras mover, el foco vuelve al botón cuando la
// lista ya está en el orden nuevo (no antes: mover la fila lo quitaría).
export function useRequisitosDeLaFase(flujo: FlujoParaConfigurar, fase: FaseParaConfigurar) {
  const { version } = useVersionDelFlujo()
  const escritura = useEscrituraDeRequisitos()
  const opciones = useOpcionesDeRequisitos(flujo.id, flujo.ambito)
  const [anuncio, setAnuncio] = useState('')
  const [movimiento, setMovimiento] = useState<(Movimiento & { firmaAntes: string }) | null>(null)
  const requisitos = useMemo(
    () => requisitosDeLaFase(flujo.requisitos, fase.id),
    [flujo.requisitos, fase.id],
  )
  const pedir = pedidosDeRequisitos(flujo.ambito, version)

  const describir = (r: RequisitoParaConfigurar) => descripcionDeRequisito(r, opciones.opciones)

  async function mover(requisito: RequisitoParaConfigurar, direccion: DireccionDeRequisito) {
    const destino = destinoDeRequisito(requisitos, requisito.id, direccion)
    if (destino === null) {
      return
    }
    const envio = await escritura.mandar(() => pedir.mover(requisito.id, destino.despuesDe))
    if (envio === null) {
      return
    }
    if (!envio.ok) {
      escritura.rechazar(envio)
      return
    }
    setAnuncio(`«${describir(requisito)}» ${direccion === 'subir' ? 'subió' : 'bajó'} un lugar.`)
    setMovimiento((antes) => ({
      id: requisito.id,
      direccion,
      firmaAntes: firmaDelOrden(requisitos),
      veces: (antes?.veces ?? 0) + 1,
    }))
  }

  // Irreversible: lo confirma el diálogo antes. Devuelve si quedó quitado (si no, el aviso ya salió).
  async function quitar(requisito: RequisitoParaConfigurar): Promise<boolean> {
    const envio = await escritura.mandar(() => pedir.quitar(requisito.id))
    if (envio === null) {
      return false
    }
    if (!envio.ok) {
      escritura.rechazar(envio)
      return false
    }
    avisarExito('Requisito quitado.')
    return true
  }

  // El del formulario: devuelve el envío entero, para que el formulario diga el motivo junto a su campo.
  function agregarDato(id: string, datos: DatosDeDato): Promise<Envio<VersionNueva> | null> {
    return escritura.mandar(() => pedir.crearDato(id, fase.id, datos))
  }

  return {
    requisitos,
    opciones,
    describir,
    anuncio,
    movimiento,
    enCurso: escritura.enCurso,
    mover,
    quitar,
    agregarDato,
    rechazar: escritura.rechazar,
    releer: escritura.releer,
  }
}

export type RequisitosDeLaFase = ReturnType<typeof useRequisitosDeLaFase>
