'use client'

import { useRef, useState } from 'react'
import { validarVehiculo, type Fuentes } from '../../../entities/esquema'
import { conDatosDeSubasta, valoresIniciales } from '../../../entities/formulario'
import type { ResultadoDeFotos } from '../../../entities/subasta-fotos'
import type { CampoDeVehiculo } from '../../../entities/campo'
import { useVehiculos } from '../../alta/hooks/use-vehiculos'
import type { EstadoDeLinea, Linea } from '../lineas'

type Args = {
  origenId: string
  fuentes: Fuentes
  // Los campos activos del layout.
  campos: readonly CampoDeVehiculo[]
  fijarEstado: (clave: string, estado: EstadoDeLinea) => void
  traerFotos: (pedido: {
    vehiculoId: string
    raw: unknown
    nombre?: string
  }) => Promise<ResultadoDeFotos>
}

type Guardable = Linea & { estado: Extract<EstadoDeLinea, { tipo: 'lista' | 'sin_guardar' }> }

const esGuardable = (linea: Linea): linea is Guardable =>
  linea.estado.tipo === 'lista' || linea.estado.tipo === 'sin_guardar'

// «Guardar N sin revisar»: da de alta cada línea lista, una a una, con el mismo esquema que valida
// el formulario. Lo que no pasa (falta un dato obligatorio, un VIN que apareció mientras tanto)
// queda marcado con su motivo y se revisa en el formulario; lo guardado trae sus fotos al final.
export function useAltaDeLista({ origenId, fuentes, campos, fijarEstado, traerFotos }: Args) {
  const ediciones = useVehiculos()
  const [progreso, setProgreso] = useState<{ hechas: number; total: number } | null>(null)
  // Un id por línea: si el guardado se reintenta, no duplica lo que ya llegó a la base.
  const ids = useRef(new Map<string, string>())

  async function guardarUna(linea: Guardable): Promise<{ id: string; titulo: string } | null> {
    const { ficha, datos } = linea.estado
    const iniciales = valoresIniciales({
      comunes: fuentes.comunes,
      campos,
      vehiculo: null,
      locale: fuentes.locale,
      ...(fuentes.zona ? { zona: fuentes.zona } : {}),
    })
    const valores = conDatosDeSubasta(iniciales, datos, campos, {
      zona: fuentes.zona,
      locale: fuentes.locale,
    })
    const validacion = validarVehiculo(fuentes, valores)
    if (!validacion.ok) {
      const motivo = Object.values(validacion.porCampo)[0] ?? 'Faltan datos.'
      fijarEstado(linea.clave, { tipo: 'sin_guardar', ficha, datos, motivo })
      return null
    }
    const id = ids.current.get(linea.clave) ?? crypto.randomUUID()
    ids.current.set(linea.clave, id)
    const resultado = await ediciones.crear({
      id,
      origenId,
      valores,
      consulta: ficha.consulta,
    })
    if (resultado.ok) {
      fijarEstado(linea.clave, { tipo: 'guardada', vehiculoId: id, numero: resultado.data.numero })
      return { id, titulo: datos.columnas.titulo ?? linea.texto }
    }
    const motivo =
      'sinRed' in resultado
        ? 'No pudimos llegar al servidor. Vuelve a intentar.'
        : resultado.error.mensaje
    fijarEstado(linea.clave, { tipo: 'sin_guardar', ficha, datos, motivo })
    return null
  }

  async function guardarListas(lineas: readonly Linea[]): Promise<void> {
    const aGuardar = lineas.filter((linea): linea is Guardable => linea.estado.tipo === 'lista')
    if (aGuardar.length === 0 || progreso !== null) {
      return
    }
    setProgreso({ hechas: 0, total: aGuardar.length })
    const guardadas: { id: string; titulo: string; raw: unknown }[] = []
    for (const linea of aGuardar) {
      const hecha = await guardarUna(linea)
      if (hecha) {
        guardadas.push({ ...hecha, raw: linea.estado.ficha.data })
      }
      setProgreso((antes) => (antes ? { ...antes, hechas: antes.hechas + 1 } : antes))
    }
    setProgreso(null)
    // Las fotos van después, de a un vehículo: son lo más lento y no frenan el alta.
    for (const una of guardadas) {
      await traerFotos({ vehiculoId: una.id, raw: una.raw, nombre: una.titulo })
    }
  }

  return { guardarListas, progreso, puedeGuardar: esGuardable }
}
