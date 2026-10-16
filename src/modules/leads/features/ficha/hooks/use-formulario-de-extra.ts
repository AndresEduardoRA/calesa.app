'use client'

import { useState } from 'react'
import { avisarExito } from '@/shared/ui/toasts'
import type { LeadDeFicha, TelefonoExtra } from '../../../entities/ficha'
import { lineaDelTelefono, paisDelEscrito } from '../../../entities/pais-del-telefono'
import { telefonoParaMostrar } from '../../../entities/telefono'
import { CLAVE_DE_TELEFONO, validarExtra } from '../../../entities/telefonos'
import { usePaises } from '../../telefono/hooks/use-paises'
import type { TelefonosExtra } from './use-telefonos-extra'

type Args = {
  ficha: LeadDeFicha
  extras: readonly TelefonoExtra[]
  guardar: TelefonosExtra['guardar']
  alCerrar: () => void
}

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
export function useFormularioDeExtra({ ficha, extras, guardar, alCerrar }: Args) {
  const [id] = useState(() => crypto.randomUUID())
  const [telefono, setTelefono] = useState('')
  const [etiqueta, setEtiqueta] = useState('')
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [aviso, setAviso] = useState<string | null>(null)
  const [enCurso, setEnCurso] = useState(false)

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

  async function enviar() {
    if (enCurso) {
      return
    }
    if (!validado.ok) {
      setErrores(validado.porCampo)
      return
    }
    setEnCurso(true)
    setAviso(null)
    const envio = await guardar({ id, telefono, etiqueta: validado.etiqueta })
    setEnCurso(false)
    if (envio.ok) {
      avisarExito('Teléfono agregado.')
      alCerrar()
    } else if ('sinRed' in envio) {
      setAviso('No pudimos llegar al servidor. Lo que escribiste sigue acá: vuelve a intentar.')
    } else {
      setErrores(envio.porCampo ?? {})
      setAviso(envio.porCampo ? null : envio.error.mensaje)
    }
  }

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
  }
}
