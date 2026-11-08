'use client'

import { useMemo } from 'react'
import { EstiloDeTonos } from '@/shared/ui/xcell'
import {
  calculoDeEjemplo,
  PAGINA_DE_EJEMPLO,
  tarjetaDeLaVistaPrevia,
} from '../../../entities/tarjeta/vista-previa-de-ejemplo'
import { modeloDeLaTarjeta } from '../../../entities/tarjeta/modelo-de-la-tarjeta'
import {
  FILAS_POR_GRUPO_EN_LA_VISTA_PREVIA,
  type PropsDeLaVistaPreviaDeLaPlantilla,
} from '../../../entities/vista-previa-de-la-plantilla'
import { TarjetaDeCotizacion } from './tarjeta-de-cotizacion'

// La vista previa en vivo del editor de la plantilla (4.19-4): la tarjeta con cifras de ejemplo, que sigue a lo que se tipea. No lee, no escribe y no es interactiva.
export function VistaPreviaDeLaPlantilla({ lectura }: PropsDeLaVistaPreviaDeLaPlantilla) {
  const modelo = useMemo(() => {
    const tarjeta = tarjetaDeLaVistaPrevia(lectura)
    return modeloDeLaTarjeta({
      lectura: tarjeta,
      calculo: calculoDeEjemplo(tarjeta),
      monedaBs: null,
      pagina: PAGINA_DE_EJEMPLO,
    })
  }, [lectura])
  const conFilasDeMas = lectura.grupos.some((g) => g.filasDeMas > 0)
  return (
    <section
      aria-label="Vista previa de la tarjeta"
      data-vista-previa-de-la-plantilla=""
      className="grid min-w-0 gap-2"
    >
      <h3 className="text-(length:--text-md) font-semibold">Vista previa</h3>
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">Cifras de ejemplo.</p>
      <EstiloDeTonos tonos={modelo.tonos} />
      <TarjetaDeCotizacion modelo={modelo} />
      {conFilasDeMas ? (
        <p className="text-(length:--text-xs) text-(--color-ink-soft)">
          Se muestran las primeras {FILAS_POR_GRUPO_EN_LA_VISTA_PREVIA} filas de cada grupo.
        </p>
      ) : null}
    </section>
  )
}
