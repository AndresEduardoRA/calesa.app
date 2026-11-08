'use client'

import type { PropsDelEditor } from '../../../entities/plantilla/props-del-editor'
import { usePanelDeLaTarjeta } from '../hooks/use-panel-de-la-tarjeta'
import { AccionesDeLaPlantilla } from './acciones-de-la-plantilla'
import { EditorDeLaPlantillaDiferido } from './diferidos'

// El editor de la tarjeta con sus modales (4.19-3c). El editor lleva la `key` de la versión (`origen:esperada`) y se remonta con cada una; los modales **no**: viven
// aquí, fuera de esa `key`, para que «Recargar» tras un PT409 no los remonte y se conserve la nota escrita. Este componente no lleva `key` de versión.
export function PestanaDeLaTarjeta({ editor }: { editor: PropsDelEditor }) {
  const panel = usePanelDeLaTarjeta()
  return (
    <>
      <EditorDeLaPlantillaDiferido
        key={`${editor.origen.id}:${editor.esperada ?? 'sin'}`}
        {...editor}
        alPublicar={panel.abrirPublicar}
        alDescartar={panel.abrirDescartar}
      />
      <AccionesDeLaPlantilla panel={panel} origen={editor.origen} esperada={editor.esperada} />
    </>
  )
}
