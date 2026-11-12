'use client'

import { useMemo, useState } from 'react'
import { diaEnZona } from '@/shared/lib/fechas'
import type { ErrorApp } from '@/shared/lib/errores'
import { useRegional } from '@/shared/ui/regional'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import type { OpcionesDeGasto } from '../../../areas/dinero/composicion.client'
import {
  borradorNuevoDeGasto,
  validarGasto,
  type BorradorDeGasto,
} from '../../../entities/dinero/gasto'
import { PANEL_PRORRATEAR } from '../../../entities/dinero/paneles'
import type { PedidoDeProrrateo } from '../../../entities/dinero/repositorio-de-gastos'
import { vistaDelReparto, type UnidadDelReparto } from '../../../entities/dinero/reparto'
import { opcionesDeTipoDeCambio } from '../../../entities/dinero/tipo-de-cambio'
import { useEnvioDeProrrateo } from './use-envio-de-prorrateo'

type Args = { unidades: readonly UnidadDelReparto[]; opciones: OpcionesDeGasto }

// Uno solo y ya elegido por la base: se preselecciona; si hay varios, el predeterminado; si no, lo elige quien carga (D1 de 6.10-1).
function tipoPorOmision(tipos: ReturnType<typeof opcionesDeTipoDeCambio>): string {
  const primero = tipos[0]
  return primero && (tipos.length === 1 || primero.esDefault) ? primero.id : ''
}

// El estado del prorrateo de un grupo (6.11-4): el formulario de un gasto (sin comprobante) y el reparto que se ve antes de confirmar; el envío es de `useEnvioDeProrrateo`. El `lote` se renueva al
// cambiar lo escrito. El equivalente en base nunca se calcula acá.
export function useProrrateo({ unidades, opciones }: Args) {
  const { locale, monedaBase, zonaHoraria } = useRegional()
  const vacio = () =>
    borradorNuevoDeGasto(monedaBase, diaEnZona(new Date().toISOString(), { zona: zonaHoraria }))
  const [valores, setValores] = useState<BorradorDeGasto>(vacio)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [lote, setLote] = useState(() => crypto.randomUUID())
  const panel = usePanelPorUrl(PANEL_PRORRATEAR)
  const envio = useEnvioDeProrrateo({
    alRepartir: () => {
      setValores(vacio())
      setErrores({})
      setLote(crypto.randomUUID())
    },
    alRenovarElLote: () => {
      setLote(crypto.randomUUID())
    },
    alRechazarCampos: setErrores,
  })
  const tipos = opcionesDeTipoDeCambio(opciones.tiposDeCambio, valores.moneda, monedaBase)
  const validado = useMemo(
    () => validarGasto(valores, { monedaBase, locale, tiposDisponibles: tipos.length }),
    [valores, monedaBase, locale, tipos.length],
  )
  const vista = vistaDelReparto(unidades, validado.ok ? validado.datos.monto : 0)

  function escribir(cambios: Partial<BorradorDeGasto>) {
    setValores((antes) => {
      const siguiente = { ...antes, ...cambios }
      if (cambios.moneda !== undefined && cambios.moneda !== antes.moneda) {
        siguiente.tipoCambioId = tipoPorOmision(
          opcionesDeTipoDeCambio(opciones.tiposDeCambio, cambios.moneda, monedaBase),
        )
      }
      return siguiente
    })
    setErrores((antes) => {
      const resto = { ...antes }
      for (const clave of [...Object.keys(cambios), 'tipoCambioId']) {
        delete resto[clave]
      }
      return resto
    })
    setLote(crypto.randomUUID())
    envio.limpiarAviso()
  }

  const pedido: PedidoDeProrrateo | null = validado.ok
    ? {
        lote,
        unidades: unidades.map((u) => u.id),
        categoriaId: validado.datos.categoriaId,
        moneda: validado.datos.moneda,
        monto: validado.datos.monto,
        tipoCambioId: validado.datos.tipoCambioId,
        fecha: validado.datos.fecha,
        proveedor: validado.datos.proveedor,
        notas: validado.datos.notas,
      }
    : null

  return {
    valores,
    errores,
    aviso: envio.aviso,
    enCurso: envio.enCurso,
    enLinea: envio.enLinea,
    tipos,
    vista,
    monedaDelGasto: validado.ok ? validado.datos.moneda : valores.moneda,
    // El diálogo sólo abre con lo escrito válido y alguna unidad (una URL escrita a mano no abre uno vacío).
    confirmando: panel.abierto && pedido !== null && unidades.length > 0,
    escribir,
    // «Repartir…»: valida y abre el diálogo que nombra el reparto.
    pedirConfirmacion: () => {
      if (validado.ok) {
        panel.abrir()
      } else {
        setErrores(validado.errores)
      }
    },
    cerrarConfirmacion: panel.cerrar,
    confirmar: async (): Promise<ErrorApp | null> => (pedido ? envio.mandar(pedido) : null),
  }
}
