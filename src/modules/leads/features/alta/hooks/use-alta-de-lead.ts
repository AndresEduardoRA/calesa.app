'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ValorDeFormulario } from '@/shared/lib/campos'
import { useBorradorDeEstado } from '@/shared/ui/use-borrador-de-estado'
import { useEnLinea } from '@/shared/ui/use-en-linea'
import { CLAVE_DEL_ALTA, valoresIniciales, type ContextoDeAlta } from '../../../entities/alta'
import type { CampoDeLead } from '../../../entities/campo'
import { telefonoParaMostrar } from '../../../entities/telefono'
import { avisoDeVerificacion } from '../../../entities/verificacion'
import { conCambio, conTelefonoRevisado, limpio, nuevoId } from './estado-del-alta'
import { useEnvioDelAlta, type Guardado } from './use-envio-del-alta'
import { useVerificarTelefono } from './use-verificar-telefono'

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

// Al volver la conexión, el guardado que quedó esperando sale solo. Es seguro repetirlo: el intento
// lleva su id y guardar lo ya guardado devuelve lo mismo.
function useReintentoAlVolver(pendiente: boolean, enviar: () => Promise<boolean>): boolean {
  const enLinea = useEnLinea()
  const ultimo = useRef(enviar)
  useEffect(() => {
    ultimo.current = enviar
  })
  useEffect(() => {
    if (enLinea && pendiente) {
      void ultimo.current()
    }
  }, [enLinea, pendiente])
  return enLinea
}

// El borrador se repone la primera vez que se abre el drawer (una recarga a mitad de tipear): volver
// a abrirlo en la misma sesión no tiene nada que recuperar, lo escrito sigue en memoria.
function useAbiertoAlgunaVez(abierto: boolean): boolean {
  const [yaAbierto, setYaAbierto] = useState(abierto)
  if (abierto && !yaAbierto) {
    setYaAbierto(true)
  }
  return yaAbierto
}

// El estado de «Nuevo lead»: dos pasos en el mismo drawer (los datos y el primer seguimiento con su
// recordatorio), el teléfono verificado al tipear, lo escrito en un borrador y, si se cae la
// conexión, todo conservado y el guardado reintentado al volver. Vive en el componente que no se
// desmonta: cerrar el drawer no pierde lo escrito.
export function useAltaDeLead({ contexto, layout, zona, abierto, alGuardar }: Args) {
  const [ultimoOrigen, setUltimoOrigen] = useState(contexto.ultimoOrigenId)
  const iniciales = useMemo(
    () => valoresIniciales({ ...contexto, ultimoOrigenId: ultimoOrigen }, layout, zona),
    [contexto, layout, zona, ultimoOrigen],
  )
  const [estado, setEstado] = useState(() => limpio(nuevoId(), iniciales))
  const borrador = useBorradorDeEstado({
    clave: 'lead-nuevo',
    valores: estado.valores,
    guardado: iniciales,
    alReponer: (cambios) => {
      setEstado((antes) => ({ ...antes, valores: { ...antes.valores, ...cambios } }))
    },
    activo: useAbiertoAlgunaVez(abierto),
  })

  const verificacion = useVerificarTelefono({
    telefono: String(estado.valores[CLAVE_DEL_ALTA.telefono] ?? ''),
    codigoDePais: contexto.telefonoCc,
    activo: abierto && estado.paso === 'datos',
  })
  // «Tomar lead» sólo vale mientras el teléfono siga sin dueño.
  const adoptar = estado.adoptar && verificacion.verificacion?.estado === 'limbo'

  const { enviar, enCurso } = useEnvioDelAlta({
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
        limpio(nuevoId(), valoresIniciales({ ...contexto, ultimoOrigenId: origen }, layout, zona)),
      )
      alGuardar(guardado)
    },
  })
  const enLinea = useReintentoAlVolver(estado.pendiente, enviar)

  return {
    paso: estado.paso,
    valores: estado.valores,
    errores: estado.errores,
    aviso: estado.aviso,
    enCurso,
    enLinea,
    esperandoConexion: estado.pendiente,
    // Lo que se sabe del teléfono.
    telefono: {
      verificando: verificacion.verificando,
      verificacion: verificacion.verificacion,
      aviso: verificacion.verificacion ? avisoDeVerificacion(verificacion.verificacion) : null,
      // «+591 70011002»: cómo va a quedar guardado lo que se escribió.
      comoSeGuarda:
        verificacion.numero === null
          ? null
          : telefonoParaMostrar(verificacion.numero, contexto.telefonoCc),
      adoptar,
    },
    cambiar: (clave: string, valor: ValorDeFormulario) => {
      setEstado((antes) => conCambio(antes, clave, valor))
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
  }
}

export type AltaDeLead = ReturnType<typeof useAltaDeLead>
