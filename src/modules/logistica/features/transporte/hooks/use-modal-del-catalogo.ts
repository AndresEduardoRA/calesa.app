'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import type { PanelesDelCatalogo } from './paneles-del-catalogo'
import { usePanelDelCatalogo } from './use-panel-del-catalogo'

type Modo = 'nuevo' | 'editar' | null

function modoDe(panel: { nuevo: boolean; hayEdicion: boolean }): Modo {
  return panel.nuevo ? 'nuevo' : panel.hayEdicion ? 'editar' : null
}

// Por qué el modal no abre (nulo = abre): editar una fila que no está en la lista ya leída, ni escribiendo la URL a mano.
function motivoParaNoAbrir<T>(
  modo: Modo,
  filas: readonly T[] | null,
  original: T | null,
  yaNoEsta: string,
): string | null {
  return modo === 'editar' && filas !== null && original === null ? yaNoEsta : null
}

// Lo que dice la URL, en una clave: cambia al abrir otra fila con el modal abierto.
function claveDeApertura(modo: Modo, apertura: number, editando: string | null, lista: unknown) {
  return modo === null || lista === null ? null : `${String(apertura)}:${modo}:${editando ?? ''}`
}

// Qué muestra el modal de un catálogo de transporte según la URL. «Editar» abre la fila de `?puerto=<id>` (o `?naviera=<id>`): una que no está no abre; se avisa una vez y la URL se limpia. Si la que se
// edita desaparece con el modal abierto, sigue a la vista y dice por qué ya no se guarda. Sin la lista leída todavía no se revisa nada.
export function useModalDelCatalogo<T extends { id: string }>(
  paneles: PanelesDelCatalogo,
  filas: readonly T[] | null,
  yaNoEsta: string,
) {
  const panel = usePanelDelCatalogo(paneles)
  const modo = modoDe(panel)
  const original = filas?.find((f) => f.id === panel.editando) ?? null
  const apertura = useApertura(modo !== null)
  const motivo = motivoParaNoAbrir(modo, filas, original, yaNoEsta)
  const rechazada = useRevisionAlAbrir(
    claveDeApertura(modo, apertura, panel.editando, filas),
    motivo,
    panel.cerrar,
  )
  const ultimo = useUltimo(modo === 'editar' ? original : null)
  const sigue = modo === 'editar' && original === null && ultimo !== null
  return {
    abierto: modo !== null && filas !== null && !rechazada,
    apertura,
    original: modo === 'editar' ? (original ?? ultimo) : null,
    noDisponible: sigue ? yaNoEsta : null,
    alCerrar: panel.cerrar,
    abrirNuevo: panel.abrirNuevo,
    abrirEdicion: panel.abrirEdicion,
  }
}
