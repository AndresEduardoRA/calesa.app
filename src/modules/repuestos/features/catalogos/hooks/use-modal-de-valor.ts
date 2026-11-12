'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import {
  esClaveDeCatalogo,
  type ClaveDeCatalogo,
  type ValorDeCatalogo,
} from '../../../entities/catalogos/catalogo'
import {
  MENSAJE_CATALOGO_QUE_NO_EXISTE,
  MENSAJE_VALOR_YA_NO_ESTA,
} from '../../../entities/catalogos/paneles'
import { usePanelDeValor } from './use-panel-de-valor'

type Modo = 'nuevo' | 'editar' | null

function modoDe(panel: { nuevo: boolean; hayEdicion: boolean }): Modo {
  return panel.nuevo ? 'nuevo' : panel.hayEdicion ? 'editar' : null
}

// Por qué el modal no abre (nulo = abre): un catálogo que no es uno de los cuatro, o un valor que no está en lo leído, aunque se escriba la URL a mano.
function motivoParaNoAbrir(
  modo: Modo,
  catalogo: ClaveDeCatalogo | null,
  original: ValorDeCatalogo | null,
): string | null {
  if (modo === 'nuevo' && catalogo === null) return MENSAJE_CATALOGO_QUE_NO_EXISTE
  if (modo === 'editar' && original === null) return MENSAJE_VALOR_YA_NO_ESTA
  return null
}

function catalogoDeLaUrl(valor: string | null): ClaveDeCatalogo | null {
  return valor !== null && esClaveDeCatalogo(valor) ? valor : null
}

function claveDeApertura(
  modo: Modo,
  apertura: number,
  editando: string | null,
  catalogo: string | null,
) {
  return modo === null ? null : `${String(apertura)}:${modo}:${editando ?? ''}:${catalogo ?? ''}`
}

// El catálogo del modal: el de la URL al agregar; al editar, el del valor (no el de la URL).
function catalogoDelModal(
  modo: Modo,
  deLaUrl: ClaveDeCatalogo | null,
  visto: ValorDeCatalogo | null,
): ClaveDeCatalogo | null {
  return modo === 'nuevo' ? deLaUrl : (visto?.catalogo ?? null)
}

// Qué muestra el modal de valores según la URL. «Agregar» pide un catálogo válido; «Editar» abre el valor de `?valor=` en el catálogo donde está. Lo que no
// abre se avisa una vez y la URL se limpia; si el que se edita desaparece con el modal abierto, sigue a la vista y dice por qué ya no se guarda.
export function useModalDeValor(valores: readonly ValorDeCatalogo[]) {
  const panel = usePanelDeValor()
  const modo = modoDe(panel)
  const original = valores.find((v) => v.id === panel.editando) ?? null
  const apertura = useApertura(modo !== null)
  const rechazada = useRevisionAlAbrir(
    claveDeApertura(modo, apertura, panel.editando, panel.catalogo),
    motivoParaNoAbrir(modo, catalogoDeLaUrl(panel.catalogo), original),
    panel.cerrar,
  )
  const ultimo = useUltimo(modo === 'editar' ? original : null)
  const visto = modo === 'editar' ? (original ?? ultimo) : null
  const catalogo = catalogoDelModal(modo, catalogoDeLaUrl(panel.catalogo), visto)
  // Mientras el modal se va, conserva el catálogo que mostraba.
  const ultimoCatalogo = useUltimo(catalogo)
  const sigue = modo === 'editar' && original === null && ultimo !== null
  return {
    abierto: modo !== null && !rechazada && catalogo !== null,
    apertura,
    catalogo: ultimoCatalogo,
    original: visto,
    noDisponible: sigue ? MENSAJE_VALOR_YA_NO_ESTA : null,
    alCerrar: panel.cerrar,
    abrirNuevo: panel.abrirNuevo,
    abrirEdicion: panel.abrirEdicion,
  }
}
