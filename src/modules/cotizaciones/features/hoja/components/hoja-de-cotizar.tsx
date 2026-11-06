'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useRef, type ReactNode } from 'react'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EstiloDeTonos, SimbolosDeXCell } from '@/shared/ui/xcell'
import type { RecalculoInicial } from '../../../entities/apertura'
import type { CalculoDeLaTarjeta } from '../../../entities/calculo-de-la-tarjeta'
import { seccionSeDibuja, type ContextoDeHoja } from '../../../entities/binding'
import { nombreDelModo } from '../../../entities/cabecera-de-la-hoja'
import { FALTA_EL_VEHICULO } from '../../../entities/guardado'
import type { HojaLista } from '../../../entities/hoja'
import { useGuardarLaGuardada, type EdicionDeLaHoja } from '../hooks/use-guardar-la-guardada'
import { useGuardarLaHoja } from '../hooks/use-guardar-la-hoja'
import type { Guardado, VistaDelGuardado } from '../hooks/use-nucleo-del-guardado'
import { useHoja, type AperturaDeHoja } from '../hooks/use-hoja'
import { AvisoDelGuardado } from './aviso-de-guardado'
import { CabeceraDeHoja } from './cabecera-de-hoja'
import { ResumenDeHoja } from './resumen-de-hoja'
import { SeccionesDeLaHoja } from './secciones-de-la-hoja'
import { VistaPreviaDeLaHojaViva } from './vista-previa-de-la-hoja'

type Props = {
  hoja: HojaLista
  inicial: RecalculoInicial
  vehiculoId: string | null
  // El vehículo de la URL que la base no dejó usar: se calculó sin él.
  vehiculoSoltado: boolean
  leadId: string | null
  // Nulo: la hoja no guarda (una guardada de sólo lectura, o todavía sin «Guardar»).
  guardado: Guardado | null
  // El borrador de lo tipeado: su clave en la pestaña (de quien cotiza) y «Descartar», con el que el marco vuelve a montar la hoja vacía. Sin él, no hay borrador.
  borrador?: { clave: string; alDescartar: () => void } | undefined
  // Quien sólo ve una cotización guardada: los modos y «Ver total Bs» se ven y no se tocan, y el resumen lo dice.
  soloLectura?: boolean
  // El total con que se guardó, cuando lo de hoy no es lo guardado (C11): lo dibuja el resumen bajo el total.
  totalGuardado?: ReactNode
  // Los campos del vehículo que quien mira elige en el panel del vehículo (4.14-2c3): la celda sin valor por uno de ellos dice dónde se elige.
  seEligen?: ReadonlySet<string> | undefined
  // De dónde calcula y con qué abre (C1, C2). Sin nada, la hoja nueva.
  abre?: AperturaDeHoja
  // Una cotización guardada que quien mira puede guardar (4.15-3): su guardado, su versión y si lo de hoy no es lo guardado. Con ella, `guardado` va nulo.
  edicion?: EdicionDeLaHoja
  // «Recargar»: sin nada, vuelve a pedir la página al servidor; el marco de una guardada lo suma para volver a montar la hoja con lo que llegue (4.15-3).
  alRecargar?: () => void
  // Lo que el marco de una guardada pone sobre la hoja (el aviso de versión, 4.15-3b); recibe si hay cambios sin guardar. La hoja nueva no lo llena.
  encima?: (hayCambios: boolean) => ReactNode
  // Lo que dibuja la vista previa de una guardada: lo guardado (P5 a, `calculoDeLoGuardado`) y si lo de hoy no lo es (`difiereAlAbrir`: la vista previa lo dice fuera de la
  // tarjeta). Sin él, la tarjeta dibuja lo que la hoja calcula ahora (la hoja nueva).
  deLoGuardado?: { calculo: CalculoDeLaTarjeta; difiere: boolean }
}

function SinDatosQueVer() {
  return (
    <EstadoSinPermiso
      titulo="No puedes ver esta hoja"
      descripcion="Tu rol puede cotizar en este origen, pero no ve los datos de su hoja. Pídeselo a quien administra los roles."
    />
  )
}

function avisoDelVehiculo(vehiculoSoltado: boolean, faltaVehiculo: boolean) {
  if (vehiculoSoltado) {
    return 'No se puede usar ese vehículo.'
  }
  return faltaVehiculo ? FALTA_EL_VEHICULO : null
}

// Lo que ven las celdas: el índice, lo tipeado, la última respuesta y los campos que se eligen en el panel del vehículo.
function useContextoDeLaHoja(
  h: ReturnType<typeof useHoja>,
  seEligen: ReadonlySet<string> | undefined,
) {
  return useMemo<ContextoDeHoja>(
    () => ({
      indice: h.indice,
      entradas: h.entradas,
      respuesta: h.respuesta,
      ...(seEligen ? { seEligen } : {}),
    }),
    [h.indice, h.entradas, h.respuesta, seEligen],
  )
}

type PropsDelResumen = Pick<Props, 'hoja' | 'totalGuardado' | 'alRecargar'> & {
  // Lo de una guardada para «Vista previa»: lo guardado que dibuja la tarjeta (nulo en la hoja nueva), si lo de hoy difiere y si hay cambios sin guardar.
  laTarjeta: Partial<NonNullable<Props['deLoGuardado']>> & { hayCambios: boolean }
  guardado: VistaDelGuardado | null
  // «Cambios guardados.» de una guardada.
  confirmacion: string | null
  h: ReturnType<typeof useHoja>
  contexto: ContextoDeHoja
  vehiculo: { id: string | null; soltado: boolean }
  boton: ReturnType<typeof useGuardarLaHoja>['boton']
  soloLectura: boolean
}

// El resumen con lo que la hoja le da: lo que dice del vehículo, el botón de guardar (o nada, si no guarda) y lo que dijo el último guardado.
function ResumenDeLaHoja({
  hoja,
  h,
  contexto,
  vehiculo,
  guardado,
  confirmacion,
  boton,
  soloLectura,
  totalGuardado,
  alRecargar,
  laTarjeta,
}: PropsDelResumen) {
  const router = useRouter()
  const recargar = alRecargar ?? router.refresh
  return (
    <ResumenDeHoja
      tarjeta={hoja.tarjetaTotal}
      monedaDelTotalBs={h.verTotalBs ? hoja.cabecera.monedaBs : null}
      modo={nombreDelModo(hoja.cabecera, h.entradas.modoTc)}
      contexto={contexto}
      estado={h.estado}
      avisoDelVehiculo={avisoDelVehiculo(
        vehiculo.soltado,
        hoja.vehiculoObligatorio && vehiculo.id === null,
      )}
      alReintentar={h.reintentar}
      alRecargar={recargar}
      guardar={boton}
      soloLectura={soloLectura}
      totalGuardado={totalGuardado}
      vistaPrevia={<VistaPreviaDeLaHojaViva hoja={hoja} h={h} {...laTarjeta} />}
      avisoDeGuardado={
        guardado === null || boton === null ? null : (
          <AvisoDelGuardado
            guardado={guardado}
            alReintentar={boton.alGuardar}
            version={hoja.formula.version}
            alRecargar={recargar}
            confirmacion={confirmacion}
          />
        )
      }
    />
  )
}

// La hoja de cotizar: las secciones del diseño en su orden (las avanzadas, detrás de un botón «Avanzado» con su modal), cada celda con su `XCell`, y el resumen. Recalcula en la base 150 ms después de la última confirmación.
// Guarda con `Ctrl/Cmd+S` o «Guardar» (el guardado vive en el marco, `useGuardado`): confirma la celda abierta, espera al total al día (P8) y arma el pedido con las
// entradas que ese recálculo calculó y la misma hoja abierta. Mientras guarda no se toca (`inert`): lo guardado la reemplaza y lo tecleado en el medio se perdería sin aviso. Los iconos y los tonos se montan una sola vez por hoja.
export function HojaDeCotizar({
  hoja,
  inicial,
  vehiculoId,
  vehiculoSoltado,
  leadId,
  borrador,
  guardado,
  seEligen,
  abre,
  edicion,
  soloLectura = false,
  totalGuardado,
  alRecargar,
  encima,
  deLoGuardado,
}: Props) {
  const raiz = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const recargar = alRecargar ?? router.refresh
  // El guardado que ve la hoja: el de la guardada que edita o el de la nueva.
  const vista = edicion?.guardado ?? guardado
  const h = useHoja({
    hoja,
    inicial,
    vehiculoId,
    alCambiar: vista?.olvidarAviso,
    borrador,
    ...abre,
  })
  const contexto = useContextoDeLaHoja(h, seEligen)
  const botonDeLaNueva = useGuardarLaHoja({ h, contexto, hoja, leadId, vehiculoId, guardado, raiz })
  const botonDeLaGuardada = useGuardarLaGuardada({ h, contexto, edicion: edicion ?? null, raiz })
  const boton = botonDeLaNueva.boton ?? botonDeLaGuardada.boton
  const guardando = vista?.estado.tipo === 'guardando'
  const dibujadas = hoja.secciones.filter((seccion) => seccionSeDibuja(seccion, contexto))
  // Puede cotizar en el origen pero su rol no ve ningún dato de la hoja (`cotizaciones.ver`): no hay nada que dibujar ni un total que dar.
  if (dibujadas.length === 0) {
    return <SinDatosQueVer />
  }
  return (
    <div ref={raiz} data-hoja="" inert={guardando} className="@container/hoja grid min-w-0 gap-4">
      <SimbolosDeXCell />
      <EstiloDeTonos tonos={hoja.tonos} />
      <div className="flex min-w-0 flex-col gap-4 @4xl/hoja:flex-row @4xl/hoja:items-start">
        <div className="grid min-w-0 flex-1 gap-4">
          {encima?.(botonDeLaGuardada.hayCambios)}
          <CabeceraDeHoja
            cabecera={hoja.cabecera}
            modoElegido={h.entradas.modoTc}
            alElegirModo={h.acciones.alElegirModo}
            verTotalBs={h.verTotalBs}
            alCambiarVerTotalBs={h.alCambiarVerTotalBs}
            deshabilitado={soloLectura}
          />
          <SeccionesDeLaHoja
            secciones={dibujadas}
            contexto={contexto}
            acciones={h.acciones}
            guardando={guardando}
            de={h.de}
            formula={hoja.formula}
            alRecargar={recargar}
          />
        </div>
        <ResumenDeLaHoja
          hoja={hoja}
          h={h}
          contexto={contexto}
          vehiculo={{ id: vehiculoId, soltado: vehiculoSoltado }}
          guardado={vista}
          confirmacion={edicion ? 'Cambios guardados.' : null}
          boton={boton}
          soloLectura={soloLectura}
          totalGuardado={totalGuardado}
          alRecargar={alRecargar}
          laTarjeta={{ ...deLoGuardado, hayCambios: botonDeLaGuardada.hayCambios }}
        />
      </div>
    </div>
  )
}
