'use client'

import { useState } from 'react'
import { diaEnZona } from '@/shared/lib/fechas'
import { formatearParaEditar } from '@/shared/lib/formato'
import { useRegional } from '@/shared/ui/regional'
import { useBorradorDeEstado } from '@/shared/ui/use-borrador-de-estado'
import type { OpcionesDeGasto } from '../../../areas/dinero/composicion.client'
import {
  borradorDePago,
  borradorNuevoDePago,
  validarPago,
  type BorradorDePago,
  type Pago,
} from '../../../entities/dinero/pago'
import { opcionesDeTipoDeCambio } from '../../../entities/dinero/tipo-de-cambio'
import { useEnvioDePago } from './use-envio-de-pago'

type Args = {
  unidadId: string
  // Nulo = «Registrar pago».
  original: Pago | null
  // Las monedas y los tipos de cambio son los mismos que ofrece un gasto (las categorías no se usan).
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

// El estado del formulario de un pago: el borrador (en `sessionStorage`, uno por unidad y pago) y el motivo junto a cada campo; el envío es de `useEnvioDePago`. El equivalente en base nunca se
// calcula acá: lo devuelve la base al guardar.
export function useFormularioDePago({ unidadId, original, opciones, alCerrar, abierto }: Args) {
  const { locale, monedaBase, zonaHoraria } = useRegional()
  const [intento] = useState(() => crypto.randomUUID())
  const [inicial] = useState<BorradorDePago>(() =>
    original
      ? borradorDePago(original, (n) => formatearParaEditar(n, { locale }))
      : borradorNuevoDePago(monedaBase, diaEnZona(new Date().toISOString(), { zona: zonaHoraria })),
  )
  const [valores, setValores] = useState<BorradorDePago>(inicial)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const tipos = opcionesDeTipoDeCambio(opciones.tiposDeCambio, valores.moneda, monedaBase)

  function escribir(cambios: Partial<BorradorDePago>) {
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
    clave: `pago-${unidadId}-${original?.id ?? 'nuevo'}`,
    valores,
    guardado: inicial,
    alReponer: (cambios) => {
      setValores((antes) => ({ ...antes, ...cambios }))
    },
  })
  const envio = useEnvioDePago({
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
    const validado = validarPago(valores, { monedaBase, locale, tiposDisponibles: tipos.length })
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
