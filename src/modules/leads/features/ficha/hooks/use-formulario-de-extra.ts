'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import { avisarExito } from '@/shared/ui/toasts'
import type { TelefonoExtra } from '../../../entities/ficha'
import { lineaDelTelefono, paisDelEscrito } from '../../../entities/pais-del-telefono'
import { telefonoParaMostrar } from '../../../entities/telefono'
import {
  CLAVE_DE_TELEFONO,
  esChoqueDeExtra,
  hayCambiosEnExtra,
  validarExtra,
  type LeadDeTelefonos,
} from '../../../entities/telefonos'
import { avisoDeVerificacion } from '../../../entities/verificacion'
import { usePaises } from '../../telefono/hooks/use-paises'
import { useVerificarTelefono } from '../../telefono/hooks/use-verificar-telefono'
import { verificarTelefonoExtra } from '../actions/verificar-telefono-extra'
import type { TelefonosExtra } from './use-telefonos-extra'

type Args = {
  lead: LeadDeTelefonos
  extras: readonly TelefonoExtra[]
  guardar: TelefonosExtra['guardar']
  alCerrar: () => void
  // Cerrado (se descartó o se fue con «atrás»), lo que esperaba la red no sale.
  abierto: boolean
}

type Entrada = Parameters<TelefonosExtra['guardar']>[0]

function comoSeGuarda(
  validado: ReturnType<typeof validarExtra>,
  codigoDePais: string | null,
  conPais: ReturnType<typeof paisDelEscrito>,
): string | null {
  if (!validado.ok) {
    return null
  }
  if (conPais) {
    return lineaDelTelefono(conPais.numero, conPais.resuelto)
  }
  return telefonoParaMostrar(validado.numero, codigoDePais)
}

type ArgsDeVerificacion = {
  lead: LeadDeTelefonos
  telefono: string
  extras: readonly TelefonoExtra[]
  abierto: boolean
}

function useVerificacionDelExtra({ lead, telefono, extras, abierto }: ArgsDeVerificacion) {
  const verificar = useAction(verificarTelefonoExtra)
  const verificado = useVerificarTelefono({
    telefono,
    codigoDePais: lead.telefonoCc,
    activo: abierto,
    validez: `${lead.telefono}|${String(extras.length)}`,
    consultar: async (escrito) => {
      const respuesta = await verificar.executeAsync({
        leadId: lead.id,
        codigoDePais: lead.telefonoCc,
        telefono: escrito,
      })
      return respuesta.data?.ok ? respuesta.data.data : null
    },
  })
  const avisoDelNumero = verificado.verificacion
    ? avisoDeVerificacion(verificado.verificacion, 'extra')
    : null
  return { verificado, avisoDelNumero }
}

// Lo escrito frente al máximo, el principal y los demás extras, y de qué país es el número.
function useValidacionDelExtra(args: {
  lead: LeadDeTelefonos
  telefono: string
  etiqueta: string
  extras: readonly TelefonoExtra[]
}) {
  const { lead, telefono, etiqueta, extras } = args
  // El formulario sólo existe abierto: la tabla se pide al abrirlo.
  const tabla = usePaises(true)
  const conPais = paisDelEscrito(tabla, telefono, { telefonoCc: lead.telefonoCc, pais: null })
  const validado = validarExtra({
    codigoDePais: lead.telefonoCc,
    telefono,
    etiqueta,
    principal: lead.telefono,
    extras,
    maximo: lead.telefonosMaximo,
  })
  return { conPais, validado }
}

// Lo escrito y el motivo junto a cada campo; escribir en un campo resuelve su motivo.
function useCamposDeExtra() {
  const [telefono, setTelefono] = useState('')
  const [etiqueta, setEtiqueta] = useState('')
  const [errores, setErrores] = useState<Record<string, string>>({})
  const sinMotivo = (clave: string) => {
    setErrores(({ [clave]: _resuelto, ...resto }) => resto)
  }
  return {
    telefono,
    etiqueta,
    errores,
    setErrores,
    escribirTelefono: (valor: string) => {
      setTelefono(valor)
      sinMotivo(CLAVE_DE_TELEFONO.telefono)
    },
    escribirEtiqueta: (valor: string) => {
      setEtiqueta(valor)
      sinMotivo(CLAVE_DE_TELEFONO.etiqueta)
    },
  }
}

// El estado de «Agregar teléfono»: lo escrito, los motivos junto a cada campo y el envío. El id del
// teléfono nace al abrir y se conserva en cada reintento: guardar dos veces lo mismo no lo duplica.
// Sin conexión, lo escrito queda y el envío sale solo al volver (una vez). Un envío a la vez: con una
// marca propia, porque el reintento al volver puede llegar mientras el anterior todavía termina.
export function useFormularioDeExtra({ lead, extras, guardar, alCerrar, abierto }: Args) {
  const [id] = useState(() => crypto.randomUUID())
  const campos = useCamposDeExtra()
  const { telefono, etiqueta, errores, setErrores } = campos
  const [aviso, setAviso] = useState<string | null>(null)
  const [pendiente, setPendiente] = useState<Entrada | null>(null)
  const unaVez = useUnEnvioALaVez()

  const { conPais, validado } = useValidacionDelExtra({ lead, telefono, etiqueta, extras })

  // ¿El número ya es de otro lead? La base dice qué pasa según la regla de la empresa: con ella encendida bloquea, apagada sólo avisa.
  const { verificado, avisoDelNumero } = useVerificacionDelExtra({
    lead,
    telefono,
    extras,
    abierto,
  })

  async function mandar(entrada: Entrada): Promise<boolean> {
    setAviso(null)
    const envio = await unaVez.mandar(() => guardar(entrada))
    if (envio === null) {
      return false
    }
    if (envio.ok && esChoqueDeExtra(envio.data)) {
      // Otra persona tomó el número entre tipearlo y enviarlo: se dice como al tipear y «Agregar» queda apagado.
      setPendiente(null)
      if (verificado.numero !== null) {
        verificado.fijar(verificado.numero, envio.data.verificacion)
      }
      return false
    }
    if (envio.ok) {
      setPendiente(null)
      avisarExito('Teléfono agregado.')
      alCerrar()
      return true
    }
    if ('sinRed' in envio) {
      setPendiente(entrada)
      return false
    }
    setPendiente(null)
    setErrores(envio.porCampo ?? {})
    setAviso(envio.porCampo ? null : envio.error.mensaje)
    return false
  }

  async function enviar(): Promise<boolean> {
    if (!validado.ok) {
      setErrores(validado.porCampo)
      return false
    }
    if (avisoDelNumero?.bloquea) {
      setErrores({ [CLAVE_DE_TELEFONO.telefono]: avisoDelNumero.texto })
      return false
    }
    return mandar({ id, telefono, etiqueta: validado.etiqueta })
  }

  const enLinea = useReintentoAlVolver(abierto ? pendiente : null, mandar)

  return {
    telefono,
    etiqueta,
    errores,
    aviso,
    // Un extra no lleva versión: nunca choca.
    conflicto: null,
    enCurso: unaVez.enCurso,
    enLinea,
    // No llegó al servidor: lo escrito sigue y sale solo al volver la conexión (o con «Reintentar»).
    esperandoConexion: pendiente !== null,
    hayCambios: hayCambiosEnExtra({ telefono, etiqueta }),
    comoSeGuarda: comoSeGuarda(validado, lead.telefonoCc, conPais),
    verificando: verificado.verificando,
    verificacion: verificado.verificacion,
    avisoDelNumero,
    sinPoderEnviar: avisoDelNumero?.bloquea === true,
    escribirTelefono: campos.escribirTelefono,
    escribirEtiqueta: campos.escribirEtiqueta,
    enviar,
    reintentar: () => {
      if (pendiente) {
        void mandar(pendiente)
      }
    },
  }
}
