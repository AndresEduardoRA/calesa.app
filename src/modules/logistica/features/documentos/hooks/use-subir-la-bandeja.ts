'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { avisarExito } from '@/shared/ui/toasts'
import { erroresDeLaBandeja } from '../../../entities/documentos/admision'
import type { TipoDeDocumento } from '../../../entities/documentos/documento'
import type { Unidad } from '../../../entities/nucleo/unidad'
import { avisarCambioDeLaUnidad } from '../../nucleo/hooks/eventos-de-la-unidad'
import { subirYRegistrar } from './subir-y-registrar'
import type { EntradaDeLaBandeja, ValoresDeLaBandeja } from './use-bandeja'

type Args = {
  unidad: Unidad
  tipo: TipoDeDocumento | null
  valores: ValoresDeLaBandeja
  // Lo que la bandeja sube con el tipo elegido.
  entran: readonly EntradaDeLaBandeja[]
  // Los que ya quedaron registrados: salen de la bandeja.
  alRegistrar: (hashes: string[]) => void
}

// «Subir N documentos» (6.06-2): por cada archivo, primero el objeto al bucket y recién entonces `documento_registrar` (commit diferido). El `id` del intento es de cada archivo y se
// conserva mientras no cambie lo escrito: reintentar no duplica. Los registrados salen de la bandeja; los que fallan quedan con su motivo y el botón dice «Reintentar los N que
// faltan». Un solo envío a la vez: una referencia, no el estado, porque un doble clic llega antes de que el estado cambie.
export function useSubirLaBandeja({ unidad, tipo, valores, entran, alRegistrar }: Args) {
  const router = useRouter()
  const [enCurso, setEnCurso] = useState(false)
  const [avance, setAvance] = useState<{ actual: number; total: number } | null>(null)
  const [fallos, setFallos] = useState<Record<string, string>>({})
  const [deLaBase, setDeLaBase] = useState<Record<string, string>>({})
  const [intentado, setIntentado] = useState(false)
  const ocupado = useRef(false)
  const intentos = useRef(new Map<string, string>())

  const errores = {
    ...(intentado ? erroresDeLaBandeja({ tipo, cantidad: entran.length, ...valores }) : {}),
    ...deLaBase,
  }

  // El id del intento de un archivo, atado a lo escrito: si cambia el tipo, una fecha o la nota, es otro registro.
  function intentoDe(hash: string): string {
    const clave = `${hash}|${valores.tipoId}|${valores.emitidoEl}|${valores.venceEl}|${valores.nota}`
    const guardado = intentos.current.get(clave)
    if (guardado) return guardado
    const nuevo = crypto.randomUUID()
    intentos.current.set(clave, nuevo)
    return nuevo
  }

  async function subir(): Promise<void> {
    if (ocupado.current) return
    setIntentado(true)
    setDeLaBase({})
    if (Object.keys(erroresDeLaBandeja({ tipo, cantidad: entran.length, ...valores })).length > 0) {
      return
    }
    ocupado.current = true
    setEnCurso(true)
    const pendientes = [...entran]
    const registrados: string[] = []
    const nuevosFallos: Record<string, string> = {}
    for (const [i, entrada] of pendientes.entries()) {
      setAvance({ actual: i + 1, total: pendientes.length })
      const resultado = await subirYRegistrar({
        unidad,
        entrada,
        valores,
        tipo,
        intento: intentoDe(entrada.datos.hash),
      })
      if (resultado.ok) {
        registrados.push(entrada.datos.hash)
        continue
      }
      nuevosFallos[entrada.datos.hash] = resultado.mensaje
      if (resultado.porCampo) setDeLaBase(resultado.porCampo)
      if (resultado.parar) break
    }
    setFallos(nuevosFallos)
    setAvance(null)
    if (registrados.length > 0) {
      alRegistrar(registrados)
      avisarCambioDeLaUnidad(unidad.id)
      router.refresh()
      if (Object.keys(nuevosFallos).length === 0) {
        avisarExito(
          registrados.length === 1
            ? 'Documento subido.'
            : `${registrados.length} documentos subidos.`,
        )
        setIntentado(false)
      }
    }
    setEnCurso(false)
    ocupado.current = false
  }

  return { subir, enCurso, avance, fallos, errores }
}
