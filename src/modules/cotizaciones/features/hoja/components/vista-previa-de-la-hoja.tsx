'use client'

import { useContext, useMemo } from 'react'
import { Button } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import {
  calculoDeLaRespuesta,
  type CalculoDeLaTarjeta,
} from '../../../entities/calculo-de-la-tarjeta'
import type { HojaLista } from '../../../entities/hoja'
import { PANEL_DE_VISTA_PREVIA } from '../hooks/urls-de-la-hoja'
import type { useHoja } from '../hooks/use-hoja'
import { ContextoDeLaVistaPrevia } from './hueco-de-la-vista-previa'
import type { PropsDeLaVistaPrevia } from './huecos'

type Props = Omit<PropsDeLaVistaPrevia, 'abierta' | 'cerrar'>

// «Vista previa» del pie del resumen (4.18-2): el botón y el modal con su URL (`?panel=vista-previa`; recargar lo abre y «atrás» lo cierra). Lo dibuja el área `tarjeta` por el
// hueco `ContextoDeLaVistaPrevia`: sin proveedor no hay botón ni nodo. El código del modal se pide la primera vez que se abre. Está también para quien sólo ve la cotización: ver
// la tarjeta no es guardar. Un solo elemento en la hoja (la hoja está al borde de sus 500 nodos): el modal va en un portal, fuera de `[data-hoja]`.
export function VistaPreviaDeLaHoja(props: Props) {
  const area = useContext(ContextoDeLaVistaPrevia)
  const panel = usePanelPorUrl(PANEL_DE_VISTA_PREVIA)
  const montar = useAbiertoAlgunaVez(panel.abierto)
  if (area === null) {
    return null
  }
  return (
    <>
      <Button
        variant="outline"
        className="min-h-11 md:min-h-8"
        onClick={() => {
          panel.abrir()
        }}
      >
        Vista previa
      </Button>
      {montar ? area.dibujar({ ...props, abierta: panel.abierto, cerrar: panel.cerrar }) : null}
    </>
  )
}

type PropsDeLaHojaViva = {
  hoja: HojaLista
  h: ReturnType<typeof useHoja>
  // Una guardada dibuja lo guardado (P5 a) y dice, fuera de la tarjeta, si lo de hoy no lo es y si hay cambios sin guardar. Sin `calculo` (la hoja nueva), lo que la hoja calcula ahora.
  calculo?: CalculoDeLaTarjeta
  difiere?: boolean
  hayCambios?: boolean
}

// «Vista previa» con lo que la hoja sabe: la versión de su fórmula, la moneda del total en Bs y los números que dibuja (los de la hoja, o los guardados).
export function VistaPreviaDeLaHojaViva({
  hoja,
  h,
  calculo,
  difiere,
  hayCambios,
}: PropsDeLaHojaViva) {
  const deLaHoja = useMemo(
    () => calculoDeLaRespuesta(h.respuesta, h.entradas.modoTc, h.verTotalBs),
    [h.respuesta, h.entradas.modoTc, h.verTotalBs],
  )
  const guardada = calculo !== undefined
  return (
    <VistaPreviaDeLaHoja
      formulaId={hoja.formula.id}
      calculo={calculo ?? deLaHoja}
      estado={guardada ? null : h.estado}
      monedaBs={hoja.cabecera.monedaBs}
      avisos={{
        difiere: guardada && difiere === true,
        cambiosSinGuardar: guardada && hayCambios === true,
      }}
    />
  )
}
