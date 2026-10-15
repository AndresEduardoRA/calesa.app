'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import { MENSAJE_DE_LEAD_NO_DISPONIBLE, type LeadDeFicha } from '../../../entities/ficha'
import { CLAVE_DE_TELEFONO, type CambioDeTelefono } from '../../../entities/telefonos'
import { normalizarTelefono, telefonoParaMostrar } from '../../../entities/telefono'
import { avisoDeVerificacion, type Verificacion } from '../../../entities/verificacion'
import { useVerificarTelefono } from '../../telefono/hooks/use-verificar-telefono'
import { cambiarTelefono } from '../actions/cambiar-telefono'
import { verificarTelefonoDeLead } from '../actions/verificar-telefono-de-lead'
import { MENSAJE_DE_VALIDACION } from '../resultado'
import { conCambio, conMotivos, enEspera, limpio, trasRechazo } from './estado-del-formulario'

type Args = {
  ficha: LeadDeFicha
  // El panel está abierto: sólo entonces se verifica el teléfono.
  activo: boolean
  // Cambió (o ya era ese): cierra el panel y lo dice.
  alTerminar: (resultado: 'cambiado' | 'sin_cambios') => void
  // El lead dejó de verse (se revocó el acceso, se fue a la papelera): vuelve a leerlo el servidor.
  alPerderElLead: () => void
}

const CLAVE = CLAVE_DE_TELEFONO.telefono

// El número que se tipea, normalizado con el código del lead, y qué dice la base de él. El principal
// llega completo a quien lo tiene en su cartera: el mismo número se dice sin ir al servidor.
function useVerificacionDelCambio({
  ficha,
  activo,
  escrito,
}: {
  ficha: LeadDeFicha
  activo: boolean
  escrito: string
}) {
  const codigoDePais = ficha.telefonoCc
  const verificar = useAction(verificarTelefonoDeLead)
  const normalizado = normalizarTelefono(codigoDePais, escrito)
  const esElMismo = normalizado.ok && normalizado.numero === ficha.telefono
  const verificacion = useVerificarTelefono({
    telefono: escrito,
    codigoDePais,
    activo: activo && !esElMismo,
    // Otra versión del lead (tras «Recargar») o otro principal: la respuesta anterior ya no vale.
    validez: `${ficha.actualizadoEn}|${ficha.telefono}`,
    consultar: async (telefono) => {
      const respuesta = await verificar.executeAsync({ id: ficha.id, codigoDePais, telefono })
      return respuesta.data?.ok ? respuesta.data.data : null
    },
  })
  const dicho: Verificacion | null = esElMismo ? { estado: 'mismo' } : verificacion.verificacion
  const aviso = dicho ? avisoDeVerificacion(dicho, 'cambio') : null
  return { normalizado, esElMismo, verificacion, dicho, aviso }
}

const MOTIVO_DEL_MISMO = avisoDeVerificacion({ estado: 'mismo' }).texto

// Lo que impide enviar sin preguntarle a la base: no es un teléfono, o es el que ya tiene.
function motivoPrevio(
  normalizado: ReturnType<typeof normalizarTelefono>,
  esElMismo: boolean,
): string | null {
  if (!normalizado.ok) {
    return normalizado.motivo
  }
  return esElMismo ? MOTIVO_DEL_MISMO : null
}

// «+591 70011002»: cómo va a quedar guardado lo que se escribió, si ya es un teléfono.
function comoSeGuarda(
  normalizado: ReturnType<typeof normalizarTelefono>,
  codigoDePais: string | null,
) {
  return normalizado.ok ? telefonoParaMostrar(normalizado.numero, codigoDePais) : null
}

// El estado de «Cambiar teléfono principal»: el número verificado al tipear (sin contarse a sí
// mismo), los motivos junto al campo, el conflicto con otra persona y, si se cae la conexión, lo
// escrito conservado y el envío reintentado al volver (cambiar al mismo número no es un conflicto).
// El conflicto se va cuando llega la versión (o el principal) nueva que trae «Recargar», no al pulsarlo:
// enviar en ese instante mandaría la vieja y volvería a chocar.
function useConflictoHastaLaVersionNueva<E extends { conflicto: string | null }>(
  vigente: string,
  setEstado: (cambio: (antes: E) => E) => void,
) {
  const [vista, setVista] = useState(vigente)
  if (vista !== vigente) {
    setVista(vigente)
    setEstado((antes) => (antes.conflicto === null ? antes : { ...antes, conflicto: null }))
  }
}

// Un cambio a la vez. Con una marca propia y no con `isPending`: el reintento al volver la conexión
// puede dispararse justo cuando el envío fallido termina, con `isPending` todavía encendido, y se perdía.
function useCambioUnaVez() {
  const cambio = useAction(cambiarTelefono)
  const enVuelo = useRef(false)
  async function mandar(pedido: Parameters<typeof cambio.executeAsync>[0]) {
    if (enVuelo.current) {
      return null
    }
    enVuelo.current = true
    try {
      return await enviarAccion<CambioDeTelefono>(
        cambio.executeAsync(pedido),
        MENSAJE_DE_VALIDACION,
      )
    } finally {
      enVuelo.current = false
    }
  }
  return { mandar, enCurso: cambio.isPending }
}

// Un número que ya existe vuelve como valor: se dice junto al campo y no cambia nada.
export function useCambiarTelefono({ ficha, activo, alTerminar, alPerderElLead }: Args) {
  const router = useRouter()
  const [estado, setEstado] = useState(() => limpio({ [CLAVE]: '' }))
  useConflictoHastaLaVersionNueva(`${ficha.actualizadoEn}|${ficha.telefono}`, setEstado)
  const escrito = String(estado.valores[CLAVE] ?? '')
  const codigoDePais = ficha.telefonoCc

  const cambio = useCambioUnaVez()
  const { normalizado, esElMismo, verificacion, dicho, aviso } = useVerificacionDelCambio({
    ficha,
    activo,
    escrito,
  })

  async function enviar(): Promise<boolean> {
    const motivo = motivoPrevio(normalizado, esElMismo)
    if (motivo !== null || !normalizado.ok) {
      setEstado((antes) => conMotivos(antes, { [CLAVE]: motivo ?? '' }))
      return false
    }
    const resultado = await cambio.mandar({
      id: ficha.id,
      actualizadoEnEsperado: ficha.actualizadoEn,
      codigoDePais,
      telefono: escrito,
    })
    if (resultado === null) {
      return false
    }
    if (resultado.ok) {
      const { data } = resultado
      if ('verificacion' in data) {
        // Ya existe: se dice junto al campo, como en el alta, y no cambió nada.
        verificacion.fijar(normalizado.numero, data.verificacion)
        return false
      }
      alTerminar(data.resultado)
      return true
    }
    if ('sinRed' in resultado) {
      setEstado(enEspera)
      return false
    }
    setEstado((antes) => trasRechazo(antes, resultado.error, resultado.porCampo))
    if (resultado.error.mensaje === MENSAJE_DE_LEAD_NO_DISPONIBLE) {
      alPerderElLead()
    }
    return false
  }

  const enLinea = useReintentoAlVolver(estado.pendiente, () => enviar())

  return {
    valor: escrito,
    errores: estado.errores,
    conflicto: estado.conflicto,
    avisoGeneral: estado.aviso,
    esperandoConexion: estado.pendiente !== null,
    enLinea,
    enCurso: cambio.enCurso,
    // Con un número que ya existe, es el mismo, no es un teléfono o un conflicto sin la versión nueva, no se envía.
    puedeEnviar: normalizado.ok && !(aviso?.bloquea ?? false) && estado.conflicto === null,
    // Lo que se sabe del teléfono que se tipea, para el campo.
    telefono: {
      verificando: activo && !esElMismo && verificacion.verificando,
      verificacion: dicho,
      aviso,
      comoSeGuarda: comoSeGuarda(normalizado, codigoDePais),
      adoptar: false,
    },
    cambiar: (valor: string) => {
      setEstado((antes) => conCambio(antes, CLAVE, valor))
    },
    // Al salir del campo: un número que no es un teléfono dice por qué (como en el alta).
    revisar: () => {
      if (escrito.trim() !== '' && !normalizado.ok) {
        setEstado((antes) => conMotivos(antes, { [CLAVE]: normalizado.motivo }))
      }
    },
    enviar,
    // «Recargar» trae la versión y el número vigentes y conserva lo que se tipeó.
    recargar: () => {
      router.refresh()
    },
  }
}

export type CambioDelPrincipal = ReturnType<typeof useCambiarTelefono>
