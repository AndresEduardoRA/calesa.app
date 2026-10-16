'use client'

import { useMemo, useState } from 'react'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import { valoresIniciales, type ContextoDeAlta } from '../../../entities/alta'
import type { CampoDeLead } from '../../../entities/campo'
import { hayAlgoEscrito, valoresDeSeguimientoNuevo } from '../../../entities/seguimiento-nuevo'
import type { ValoresDelSeguimiento } from '../../../entities/seguimiento'
import { conSeguimientoCambiado, conTelefonoRevisado, limpio, nuevoId } from './estado-del-alta'
import { useBorradorDelAlta } from './use-borrador-del-alta'
import { useVerificacionDelAlta, vistaDelTelefono } from './use-verificacion-del-alta'
import { useEnvioDelAlta, type Guardado } from './use-envio-del-alta'
import { usePaisDelAlta } from './use-pais-del-alta'

export type { Guardado } from './use-envio-del-alta'
export type { Paso } from './estado-del-alta'

type Args = {
  contexto: ContextoDeAlta
  layout: readonly CampoDeLead[]
  zona: string
  // El drawer está abierto: sólo entonces se verifica el teléfono y se repone un borrador.
  abierto: boolean
  alGuardar: (guardado: Guardado) => void
}

// El estado de «Nuevo lead»: dos pasos en el mismo drawer (los datos y, opcional, el primer
// seguimiento con su próximo contacto), el teléfono verificado al tipear, lo escrito en un borrador
// (los datos y el seguimiento, uno solo) y, si se cae la conexión, todo conservado y el guardado
// reintentado al volver. Vive en el componente que no se desmonta: cerrar el drawer no pierde lo
// escrito.
export function useAltaDeLead({ contexto, layout, zona, abierto, alGuardar }: Args) {
  const [ultimoOrigen, setUltimoOrigen] = useState(contexto.ultimoOrigenId)
  const iniciales = useMemo(
    () => valoresIniciales({ ...contexto, ultimoOrigenId: ultimoOrigen }, layout, zona),
    [contexto, layout, zona, ultimoOrigen],
  )
  const seguimientoInicial = useMemo(
    () => valoresDeSeguimientoNuevo(contexto.tiposDeSeguimiento),
    [contexto.tiposDeSeguimiento],
  )
  const [estado, setEstado] = useState(() => limpio(nuevoId(), iniciales, seguimientoInicial))
  const yaAbierto = useAbiertoAlgunaVez(abierto)
  const pais = usePaisDelAlta({ contexto, layout, iniciales, estado, setEstado, activo: yaAbierto })
  const borrador = useBorradorDelAlta({
    estado,
    setEstado,
    iniciales,
    seguimientoInicial,
    tiposActivos: contexto.tiposDeSeguimiento.map((t) => t.id),
    activo: yaAbierto,
  })

  const { verificacion, adoptar } = useVerificacionDelAlta({ contexto, estado, abierto })

  const { enviar, guardar, enCurso } = useEnvioDelAlta({
    estado,
    setEstado,
    layout,
    contexto,
    zona,
    telefono: { ...verificacion, adoptar: estado.adoptar },
    alGuardado: (guardado, origenId) => {
      borrador.limpiar()
      const origen = origenId ?? ultimoOrigen
      setUltimoOrigen(origen)
      // Listo para el siguiente: otro intento, otro formulario, el mismo origen.
      setEstado(
        limpio(
          nuevoId(),
          valoresIniciales({ ...contexto, ultimoOrigenId: origen }, layout, zona),
          seguimientoInicial,
        ),
      )
      alGuardar(guardado)
    },
  })
  // Al volver la conexión sale solo lo que quedó esperando: el intento lleva su id y guardar lo ya
  // guardado devuelve lo mismo.
  const enLinea = useReintentoAlVolver(estado.pendiente ? true : null, () => guardar())

  return {
    paso: estado.paso,
    valores: estado.valores,
    errores: estado.errores,
    seguimiento: estado.seguimiento,
    erroresDelSeguimiento: estado.erroresDelSeguimiento,
    // Hay un primer seguimiento que ofrecer: con tipos activos. El paso 2 es opcional.
    conPasoDeSeguimiento: contexto.tiposDeSeguimiento.length > 0,
    hayAlgoEscrito: hayAlgoEscrito(estado.seguimiento),
    aviso: estado.aviso,
    enCurso,
    enLinea,
    esperandoConexion: estado.pendiente,
    // Lo que se sabe del teléfono.
    telefono: vistaDelTelefono({ verificacion, adoptar, contexto, linea: pais.linea }),
    pais: pais.campo,
    anuncioDelPais: pais.anuncio,
    cambiar: pais.cambiar,
    cambiarSeguimiento: <K extends keyof ValoresDelSeguimiento>(
      clave: K,
      valor: ValoresDelSeguimiento[K],
    ) => {
      setEstado((antes) => conSeguimientoCambiado(antes, clave, valor))
    },
    tomar: (tomarlo: boolean) => {
      setEstado((antes) => ({ ...antes, adoptar: tomarlo }))
    },
    revisarTelefono: () => {
      setEstado((antes) => conTelefonoRevisado(antes, contexto.telefonoCc))
    },
    volver: () => {
      setEstado((antes) => ({ ...antes, paso: 'datos' }))
    },
    enviar,
    guardar,
  }
}

export type AltaDeLead = ReturnType<typeof useAltaDeLead>
