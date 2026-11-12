'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import type { CategoriaDeGasto } from '../../../entities/dinero/categoria'
import { MENSAJE_CATEGORIA_YA_NO_ESTA } from '../../../entities/dinero/paneles'
import { usePanelDeCategoria } from './use-panel-de-categoria'

type Modo = 'nuevo' | 'editar' | null

// Por qué el modal no abre (nulo = abre): editar una que no está en la lista ya leída, ni escribiendo la URL a mano.
function motivoParaNoAbrir(
  modo: Modo,
  categorias: readonly CategoriaDeGasto[] | null,
  original: CategoriaDeGasto | null,
): string | null {
  return modo === 'editar' && categorias !== null && original === null
    ? MENSAJE_CATEGORIA_YA_NO_ESTA
    : null
}

function modoDe(panel: { nuevo: boolean; hayEdicion: boolean }): Modo {
  return panel.nuevo ? 'nuevo' : panel.hayEdicion ? 'editar' : null
}

// Lo que dice la URL, en una clave: cambia al abrir otra categoría con el modal abierto.
function claveDeApertura(modo: Modo, apertura: number, editando: string | null, lista: unknown) {
  return modo === null || lista === null ? null : `${String(apertura)}:${modo}:${editando ?? ''}`
}

// Qué muestra el modal de categorías según la URL. «Editar» abre la de `?categoria=<id>`: una que no está no abre; se avisa una vez y la URL se limpia. Si la que se edita desaparece con el modal abierto,
// sigue a la vista y dice por qué ya no se guarda. Sin la lista leída todavía no se revisa nada.
export function useModalDeCategoria(categorias: readonly CategoriaDeGasto[] | null) {
  const panel = usePanelDeCategoria()
  const modo = modoDe(panel)
  const original = categorias?.find((c) => c.id === panel.editando) ?? null
  const apertura = useApertura(modo !== null)
  const motivo = motivoParaNoAbrir(modo, categorias, original)
  const rechazada = useRevisionAlAbrir(
    claveDeApertura(modo, apertura, panel.editando, categorias),
    motivo,
    panel.cerrar,
  )
  const ultimo = useUltimo(modo === 'editar' ? original : null)
  const sigue = modo === 'editar' && original === null && ultimo !== null
  return {
    abierto: modo !== null && categorias !== null && !rechazada,
    apertura,
    original: modo === 'editar' ? (original ?? ultimo) : null,
    noDisponible: sigue ? MENSAJE_CATEGORIA_YA_NO_ESTA : null,
    alCerrar: panel.cerrar,
    abrirNuevo: panel.abrirNuevo,
    abrirEdicion: panel.abrirEdicion,
  }
}
