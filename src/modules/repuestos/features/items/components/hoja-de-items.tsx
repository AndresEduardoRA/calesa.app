'use client'

import type { ReactNode } from 'react'
import { UnaSolaVista } from '@/shared/ui/lista'
import { SimbolosDeXCell } from '@/shared/ui/xcell'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import {
  hojaLlena,
  type CatalogosDeLaHoja,
  type MonedaDeLaHoja,
} from '../../../entities/items/hoja'
import type { FilaDeItem } from '../../../entities/nucleo/item'
import { useEliminarItemPorUrl } from '../hooks/use-eliminar-item-por-url'
import { useHojaDeItems } from '../hooks/use-hoja-de-items'
import {
  AvisoDeCerrado,
  AvisoDeConflictoDeLaHoja,
  AvisoDeTopeDeLaHoja,
  HojaVacia,
} from './avisos-de-la-hoja'
import type { ContextoDeLaHoja } from './contexto-de-la-hoja'
import { ConfirmarEliminarItemDiferido } from './diferidos'
import { FilaNueva } from './fila-nueva'
import { TablaDeItems } from './tabla-de-items'
import { TarjetasDeItems } from './tarjetas-de-items'

export type PropsDeLaHoja = {
  proyectoId: string
  filas: readonly FilaDeItem[]
  hayMas: boolean
  catalogos: CatalogosDeLaHoja
  // Las monedas activas, en su orden: la primera es la por defecto (D52).
  monedas: readonly MonedaDeLaHoja[]
  // `puede(permisos, 'repuestos.editar')`, calculado en el servidor.
  puedeEditar: boolean
  cerrado: boolean
}

const primeraMoneda = (monedas: readonly MonedaDeLaHoja[]) => monedas[0]?.codigo ?? null
const cabeOtro = (editable: boolean, filas: readonly FilaDeItem[], hayMas: boolean) =>
  editable && !hojaLlena(filas, hayMas)

function Vistas({
  filas,
  contexto,
  filaNueva,
}: {
  filas: readonly FilaDeItem[]
  contexto: ContextoDeLaHoja
  filaNueva: ReactNode
}) {
  return (
    <UnaSolaVista
      tabla={() => <TablaDeItems filas={filas} contexto={contexto} filaNueva={filaNueva} />}
      tarjetas={() => <TarjetasDeItems filas={filas} contexto={contexto} filaNueva={filaNueva} />}
    />
  )
}

// La hoja de ítems de un proyecto (8.09-2, C8 a C13): la tabla desde 768 px y, debajo, una tarjeta por ítem, en una sola vista, editable celda a celda con `repuestos.editar` y el proyecto abierto; sin
// eso, de lectura. Vacío de primera vez, aviso del proyecto cerrado, tope de 200 (D54: con 200 no se dibuja la fila nueva) y el conflicto con «Recargar». No filtra ni pagina: hasta 200 filas.
export function HojaDeItems(props: PropsDeLaHoja) {
  const editable = props.puedeEditar && !props.cerrado
  const monedaPorDefecto = primeraMoneda(props.monedas)
  const hoja = useHojaDeItems({
    proyectoId: props.proyectoId,
    filasDelServidor: props.filas,
    monedaPorDefecto,
  })
  const eliminacion = useEliminarItemPorUrl(hoja.filas, editable)
  const montarEliminar = useAbiertoAlgunaVez(eliminacion.abierto)
  const aEliminar = eliminacion.item

  const contexto: ContextoDeLaHoja = {
    editable,
    catalogos: props.catalogos,
    monedas: props.monedas,
    monedaPorDefecto,
    errores: hoja.errores,
    guardar: hoja.guardar,
    alConfirmarNumero: hoja.alConfirmarNumero,
    alReiniciar: hoja.alReiniciar,
    alPedirEliminar: eliminacion.abrir,
  }
  const filaNueva = cabeOtro(editable, hoja.filas, props.hayMas) ? (
    <FilaNueva alAgregar={hoja.agregar} />
  ) : null
  const hayFilas = hoja.filas.length > 0

  return (
    <section aria-label="Ítems del proyecto" className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <SimbolosDeXCell />
      {props.cerrado ? <AvisoDeCerrado /> : null}
      {hoja.conflicto ? (
        <AvisoDeConflictoDeLaHoja mensaje={hoja.conflicto} alRecargar={hoja.olvidarConflicto} />
      ) : null}
      {hayFilas ? null : <HojaVacia />}
      {hayFilas || filaNueva !== null ? (
        <Vistas filas={hoja.filas} contexto={contexto} filaNueva={filaNueva} />
      ) : null}
      {props.hayMas ? <AvisoDeTopeDeLaHoja /> : null}
      {montarEliminar ? (
        <ConfirmarEliminarItemDiferido
          abierto={eliminacion.abierto}
          alCerrar={eliminacion.cerrar}
          item={aEliminar}
          alEliminar={hoja.eliminar}
          focoAlCerrar={() => focoDeEliminar(aEliminar)}
        />
      ) : null}
    </section>
  )
}

// Al cerrar el diálogo el foco vuelve al botón «Eliminar» de esa fila (la URL lo abrió y el botón pudo redibujarse).
function focoDeEliminar(item: FilaDeItem | null): HTMLElement | true {
  return (item && document.querySelector<HTMLElement>(`[data-eliminar-item="${item.id}"]`)) ?? true
}
