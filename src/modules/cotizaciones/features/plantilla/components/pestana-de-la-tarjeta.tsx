'use client'

import type { ComponentType } from 'react'
import type { PropsDelEditor } from '../../../entities/plantilla/props-del-editor'
import type { PropsDeLaVistaPreviaDeLaPlantilla } from '../../../entities/vista-previa-de-la-plantilla'
import { usePanelDeLaTarjeta } from '../hooks/use-panel-de-la-tarjeta'
import { AccionesDeLaPlantilla } from './acciones-de-la-plantilla'
import { EditorDeLaPlantillaDiferido } from './diferidos'

// El editor de la tarjeta con sus modales (4.19-3c). El editor lleva la `key` de la versión (`origen:esperada`) y se remonta con cada una; los modales **no**: viven
// aquí, fuera de esa `key`, para que «Recargar» tras un PT409 no los remonte y se conserve la nota escrita. Este componente no lleva `key` de versión.
type Props = {
  editor: PropsDelEditor
  // El hueco de la vista previa (4.19-4): lo pasa la página (el área `tarjeta` lo llena).
  VistaPrevia?: ComponentType<PropsDeLaVistaPreviaDeLaPlantilla>
}

export function PestanaDeLaTarjeta({ editor, VistaPrevia }: Props) {
  const panel = usePanelDeLaTarjeta()
  return (
    <>
      <EditorDeLaPlantillaDiferido
        key={`${editor.origen.id}:${editor.esperada ?? 'sin'}`}
        {...editor}
        VistaPrevia={VistaPrevia}
        alPublicar={panel.abrirPublicar}
        alDescartar={panel.abrirDescartar}
      />
      <AccionesDeLaPlantilla panel={panel} origen={editor.origen} esperada={editor.esperada} />
    </>
  )
}
