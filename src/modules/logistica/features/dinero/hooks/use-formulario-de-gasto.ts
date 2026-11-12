'use client'

import { useState } from 'react'
import { diaEnZona } from '@/shared/lib/fechas'
import { formatearParaEditar } from '@/shared/lib/formato'
import { useRegional } from '@/shared/ui/regional'
import { useBorradorDeEstado } from '@/shared/ui/use-borrador-de-estado'
import type { OpcionesDeGasto } from '../../../areas/dinero/composicion.client'
import {
  borradorDeGasto,
  borradorNuevoDeGasto,
  validarGasto,
  type BorradorDeGasto,
  type Gasto,
} from '../../../entities/dinero/gasto'
import { opcionesDeTipoDeCambio } from '../../../entities/dinero/tipo-de-cambio'
import { useEnvioDeGasto } from './use-envio-de-gasto'

type Args = {
  unidadId: string
  // Nulo = «Registrar gasto».
  original: Gasto | null
  opciones: OpcionesDeGasto
  alCerrar: () => void
  // Cerrado, lo que esperaba la red no sale ni se escribe borrador.
  abierto: boolean
}

// Uno solo y ya elegido por la base: se preselecciona; si hay varios, el predeterminado; si no, lo elige quien carga (D1 de 6.10-1).
function tipoPorOmision(tipos: ReturnType<typeof opcionesDeTipoDeCambio>): string {
  const primero = tipos[0]
  return primero && (tipos.length === 1 || primero.esDefault) ? primero.id : ''
}

// El estado del formulario de un gasto: el borrador (en `sessionStorage`, uno por unidad y gasto: son más de 6 campos) y el motivo junto a cada campo; el envío es de `useEnvioDeGasto`. El
// equivalente en base nunca se calcula acá: lo devuelve la base al guardar.
export function useFormularioDeGasto({ unidadId, original, opciones, alCerrar, abierto }: Args) {
  const { locale, monedaBase, zonaHoraria } = useRegional()
  const [intento] = useState(() => crypto.randomUUID())
  const [inicial] = useState<BorradorDeGasto>(() =>
    original
      ? borradorDeGasto(original, (n) => formatearParaEditar(n, { locale }))
      : borradorNuevoDeGasto(
          monedaBase,
          diaEnZona(new Date().toISOString(), { zona: zonaHoraria }),
        ),
  )
  const [valores, setValores] = useState<BorradorDeGasto>(inicial)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const tipos = opcionesDeTipoDeCambio(opciones.tiposDeCambio, valores.moneda, monedaBase)

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
      for (const clave of cambios.moneda === undefined
        ? Object.keys(cambios)
        : [...Object.keys(cambios), 'tipoCambioId']) {
        delete resto[clave]
      }
      return resto
    })
  }

  const borrador = useBorradorDeEstado({
    activo: abierto,
    clave: `gasto-${unidadId}-${original?.id ?? 'nuevo'}`,
    valores,
    guardado: inicial,
    alReponer: (cambios) => {
      setValores((antes) => ({ ...antes, ...cambios }))
    },
  })
  const envio = useEnvioDeGasto({
    unidadId,
    original,
    intento,
    abierto,
    alCerrar,
    alGuardar: borrador.limpiar,
    alRechazarCampos: setErrores,
  })

  async function enviar(): Promise<boolean> {
    if (envio.conflicto !== null || envio.enCurso) {
      return false
    }
    const validado = validarGasto(valores, { monedaBase, locale, tiposDisponibles: tipos.length })
    if (!validado.ok) {
      setErrores(validado.errores)
      return false
    }
    return envio.mandar(validado.datos)
  }

  return {
    valores,
    errores,
    aviso: envio.aviso,
    conflicto: envio.conflicto,
    enCurso: envio.enCurso,
    enLinea: envio.enLinea,
    esperandoConexion: envio.esperandoConexion,
    tipos,
    // Cerrar ahora perdería lo escrito: el drawer pregunta antes de salir por un aviso.
    hayCambios: JSON.stringify(valores) !== JSON.stringify(inicial),
    escribir,
    enviar,
    descartarBorrador: borrador.limpiar,
  }
}
