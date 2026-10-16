'use client'

import { useRef, useState } from 'react'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import { avisarExito } from '@/shared/ui/toasts'
import type { LeadDeFicha, TelefonoExtra } from '../../../entities/ficha'
import { lineaDelTelefono, paisDelEscrito } from '../../../entities/pais-del-telefono'
import { telefonoParaMostrar } from '../../../entities/telefono'
import { CLAVE_DE_TELEFONO, hayCambiosEnExtra, validarExtra } from '../../../entities/telefonos'
import { usePaises } from '../../telefono/hooks/use-paises'
import type { TelefonosExtra } from './use-telefonos-extra'

type Args = {
  ficha: LeadDeFicha
  extras: readonly TelefonoExtra[]
  guardar: TelefonosExtra['guardar']
  alCerrar: () => void
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

// El estado de «Agregar teléfono»: lo escrito, los motivos junto a cada campo y el envío. El id del
// teléfono nace al abrir y se conserva en cada reintento: guardar dos veces lo mismo no lo duplica.
// Sin conexión, lo escrito queda y el envío sale solo al volver (una vez). Un envío a la vez: con una
// marca propia, porque el reintento al volver puede llegar mientras el anterior todavía termina.
export function useFormularioDeExtra({ ficha, extras, guardar, alCerrar }: Args) {
  const [id] = useState(() => crypto.randomUUID())
  const [telefono, setTelefono] = useState('')
  const [etiqueta, setEtiqueta] = useState('')
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [aviso, setAviso] = useState<string | null>(null)
  const [enCurso, setEnCurso] = useState(false)
  const [pendiente, setPendiente] = useState<Entrada | null>(null)
  const enVuelo = useRef(false)

  // El formulario sólo existe abierto: la tabla se pide al abrirlo.
  const tabla = usePaises(true)
  const conPais = paisDelEscrito(tabla, telefono, { telefonoCc: ficha.telefonoCc, pais: null })

  const validado = validarExtra({
    codigoDePais: ficha.telefonoCc,
    telefono,
    etiqueta,
    principal: ficha.telefono,
    extras,
  })

  async function mandar(entrada: Entrada): Promise<boolean> {
    if (enVuelo.current) {
      return false
    }
    enVuelo.current = true
    setEnCurso(true)
    setAviso(null)
    const envio = await guardar(entrada)
    enVuelo.current = false
    setEnCurso(false)
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
    return mandar({ id, telefono, etiqueta: validado.etiqueta })
  }

  const enLinea = useReintentoAlVolver(pendiente, mandar)

  // Escribir en un campo resuelve su motivo.
  const sinMotivo = (clave: string) => {
    setErrores(({ [clave]: _resuelto, ...resto }) => resto)
  }

  return {
    telefono,
    etiqueta,
    errores,
    aviso,
    enCurso,
    enLinea,
    // No llegó al servidor: lo escrito sigue y sale solo al volver la conexión (o con «Reintentar»).
    esperandoConexion: pendiente !== null,
    // Cerrar ahora perdería lo escrito: el modal pregunta antes.
    hayCambios: hayCambiosEnExtra({ telefono, etiqueta }),
    // «+54 91155550000 · Argentina»: cómo va a quedar guardado lo que se escribió y de qué país es.
    comoSeGuarda: comoSeGuarda(validado, ficha.telefonoCc, conPais),
    escribirTelefono: (valor: string) => {
      setTelefono(valor)
      sinMotivo(CLAVE_DE_TELEFONO.telefono)
    },
    escribirEtiqueta: (valor: string) => {
      setEtiqueta(valor)
      sinMotivo(CLAVE_DE_TELEFONO.etiqueta)
    },
    enviar,
    reintentar: () => {
      if (pendiente) {
        void mandar(pendiente)
      }
    },
  }
}
