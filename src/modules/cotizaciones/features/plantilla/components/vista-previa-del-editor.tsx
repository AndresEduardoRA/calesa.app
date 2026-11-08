'use client'

import { useMemo, type ComponentType } from 'react'
import type { FilasDelEditor } from '../../../entities/plantilla/filas-del-editor'
import type { Plantilla } from '../../../entities/plantilla/forma-de-plantilla'
import type { TonoDelCatalogo } from '../../../entities/plantilla/lectura-de-la-plantilla'
import { lecturaParaLaVistaPrevia } from '../../../entities/plantilla/lectura-para-la-vista-previa'
import type { ContextoDePlantilla } from '../../../entities/plantilla/validar-plantilla'
import type { PropsDeLaVistaPreviaDeLaPlantilla } from '../../../entities/vista-previa-de-la-plantilla'

type Props = {
  VistaPrevia: ComponentType<PropsDeLaVistaPreviaDeLaPlantilla>
  plantilla: Plantilla
  filas: FilasDelEditor
  contexto: ContextoDePlantilla
  tonos: readonly TonoDelCatalogo[]
}

// La vista previa en vivo (4.19-4): arma la lectura con la plantilla de trabajo (guardada o no) y se la da al componente que llena el hueco. Desde `xl` va al costado y
// pegada arriba; debajo, en su lugar del flujo (tras el cuerpo y antes de «Guardar»: lo ordena la grilla del editor).
export function VistaPreviaDelEditor({ VistaPrevia, plantilla, filas, contexto, tonos }: Props) {
  const lectura = useMemo(
    () => lecturaParaLaVistaPrevia({ plantilla, filas, contexto, tonos }),
    [plantilla, filas, contexto, tonos],
  )
  return (
    <div className="min-w-0 self-start xl:sticky xl:top-4 xl:col-start-2 xl:row-span-2 xl:row-start-1">
      <VistaPrevia lectura={lectura} />
    </div>
  )
}
