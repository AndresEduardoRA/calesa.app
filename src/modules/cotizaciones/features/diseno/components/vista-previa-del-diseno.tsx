'use client'

import { useMemo } from 'react'
import type { Tono } from '@/shared/ui/xcell'
import type { AnchoDeLaVistaPrevia } from '../../../entities/diseno/anchos-de-la-vista-previa'
import { cifrasDelDiseno } from '../../../entities/diseno/cifras-del-diseno'
import type { Diseno } from '../../../entities/diseno'
import type { DisenoParaEditar } from '../../../entities/diseno/edicion-del-diseno'
import { hojaDeLaVistaPrevia } from '../../../entities/diseno/hoja-del-diseno'
import { HojaDePrueba } from './hoja-de-prueba'
import { MarcoDeLaVistaPrevia } from './marco-de-la-vista-previa'

type Props = {
  origen: { id: string; nombre: string }
  // El diseño en edición, con lo aplicado aunque no se haya guardado.
  trabajo: Diseno
  leida: DisenoParaEditar
  tonos: readonly Tono[]
  ancho: AnchoDeLaVistaPrevia
}

const AVISO = 'text-(length:--text-sm) text-(--color-ink-soft)'
const CON_CIFRAS = 'Cifras de prueba: los datos en 0; no son las de una cotización.'
const SIN_CIFRAS = 'No se pudieron calcular las cifras de prueba; se dibuja sin cifras.'

// La vista previa de la hoja (4.22-5): el diseño en edición dibujado como la hoja de cotizar, a 412 px, a 1.280 o a 412 con el texto al doble. Las cifras se calculan una vez por versión
// leída (dependen de la definición y los parámetros, que este editor no cambia); la hoja se vuelve a armar con cada cambio del diseño.
export function VistaPreviaDelDiseno({ origen, trabajo, leida, tonos, ancho }: Props) {
  const respuesta = useMemo(
    () => cifrasDelDiseno(leida.definicion, leida.params),
    [leida.definicion, leida.params],
  )
  const hoja = useMemo(
    () => hojaDeLaVistaPrevia(origen, trabajo, leida.definicion, tonos),
    [origen, trabajo, leida.definicion, tonos],
  )
  return (
    <section id="vista-previa-del-diseno" className="grid min-w-0 gap-2">
      <p role="status" className={AVISO}>
        {respuesta === null ? SIN_CIFRAS : CON_CIFRAS}
      </p>
      <MarcoDeLaVistaPrevia ancho={ancho}>
        <HojaDePrueba hoja={hoja} respuesta={respuesta} />
      </MarcoDeLaVistaPrevia>
    </section>
  )
}
