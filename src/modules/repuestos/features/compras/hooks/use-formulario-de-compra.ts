'use client'

import { useState } from 'react'
import { diaEnZona } from '@/shared/lib/fechas'
import { formatearParaEditar } from '@/shared/lib/formato'
import { useRegional } from '@/shared/ui/regional'
import { useBorradorDeEstado } from '@/shared/ui/use-borrador-de-estado'
import type { FilaDeCompra } from '../../../entities/compras/compra'
import {
  borradorDeCompra,
  borradorNuevoDeCompra,
  validarCompra,
  type BorradorDeCompra,
} from '../../../entities/compras/formulario'
import { useEnvioDeCompra } from './use-envio-de-compra'

type Args = {
  proyectoId: string
  // Nula = «Registrar compra».
  original: FilaDeCompra | null
  alCerrar: () => void
  // Cerrado, lo que esperaba la red no sale ni se escribe borrador.
  abierto: boolean
}

// El estado del formulario de una compra (8.11-3, C11): el borrador (en `sessionStorage`, uno por proyecto y compra: son 7 campos) y el motivo junto a cada campo; el
// envío es de `useEnvioDeCompra`. El equivalente en la moneda base nunca se calcula acá: lo pone la base al guardar.
export function useFormularioDeCompra({ proyectoId, original, alCerrar, abierto }: Args) {
  const { locale, monedaBase, zonaHoraria } = useRegional()
  // Uno por apertura (el Drawer cambia la `key`): reintentar no duplica.
  const [intento] = useState(() => crypto.randomUUID())
  const [inicial] = useState<BorradorDeCompra>(() =>
    original
      ? borradorDeCompra(original, (n) => formatearParaEditar(n, { locale }))
      : borradorNuevoDeCompra(
          monedaBase,
          diaEnZona(new Date().toISOString(), { zona: zonaHoraria }),
        ),
  )
  const [valores, setValores] = useState<BorradorDeCompra>(inicial)
  const [errores, setErrores] = useState<Record<string, string>>({})

  function escribir(cambios: Partial<BorradorDeCompra>) {
    setValores((antes) => ({ ...antes, ...cambios }))
    setErrores((antes) => {
      const resto = { ...antes }
      for (const clave of Object.keys(cambios)) delete resto[clave]
      return resto
    })
  }

  const borrador = useBorradorDeEstado({
    activo: abierto,
    clave: `compra-${proyectoId}-${original?.id ?? 'nueva'}`,
    valores,
    guardado: inicial,
    alReponer: (cambios) => {
      setValores((antes) => ({ ...antes, ...cambios }))
    },
  })
  const envio = useEnvioDeCompra({
    proyectoId,
    original,
    intento,
    abierto,
    alCerrar,
    alGuardar: borrador.limpiar,
    alRechazarCampos: setErrores,
  })

  async function enviar(): Promise<boolean> {
    if (envio.conflicto !== null || envio.enCurso) return false
    const validado = validarCompra(valores, { locale })
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
    // Cerrar ahora perdería lo escrito: el Drawer pregunta antes de salir por un aviso.
    hayCambios: JSON.stringify(valores) !== JSON.stringify(inicial),
    escribir,
    enviar,
    descartarBorrador: borrador.limpiar,
  }
}
