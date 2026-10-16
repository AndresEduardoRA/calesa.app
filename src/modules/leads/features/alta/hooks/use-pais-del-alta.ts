'use client'

import type { Dispatch, SetStateAction } from 'react'
import type { ValorDeFormulario, ValoresDeFormulario } from '@/shared/lib/campos'
import { CLAVE_DEL_ALTA, claveDeAtributoDeAlta, type ContextoDeAlta } from '../../../entities/alta'
import type { CampoDeLead } from '../../../entities/campo'
import {
  CLAVE_DEL_PAIS,
  lineaDelTelefono,
  paisDelEscrito,
  vistaDelPais,
} from '../../../entities/pais-del-telefono'
import { usePaises } from '../../telefono/hooks/use-paises'
import { conCambio, conPaisDelTelefono, conPaisElegido, type Estado } from './estado-del-alta'

type Args = {
  contexto: ContextoDeAlta
  layout: readonly CampoDeLead[]
  iniciales: ValoresDeFormulario
  estado: Estado
  setEstado: Dispatch<SetStateAction<Estado>>
  // La tabla sólo se pide cuando el drawer se abrió alguna vez.
  activo: boolean
}

// El país del número en el alta: la línea («+54 91155550000 · Argentina»), los botones cuando el
// prefijo es de varios países, el aviso para el lector de pantalla y el cambio que lleva «País» al
// del número. Si «País» está apagado la línea se dice igual, pero no se llena ni se pregunta nada.
export function usePaisDelAlta({ contexto, layout, iniciales, estado, setEstado, activo }: Args) {
  const tabla = usePaises(activo)
  const campoPais = layout.find((c) => c.clave === CLAVE_DEL_PAIS && c.activo) ?? null
  const clave = campoPais ? claveDeAtributoDeAlta(CLAVE_DEL_PAIS) : null
  const empresa = { telefonoCc: contexto.telefonoCc, pais: contexto.empresa.pais }
  const elegido = clave === null ? '' : String(estado.valores[clave] ?? '')
  const escrito = paisDelEscrito(
    tabla,
    String(estado.valores[CLAVE_DEL_ALTA.telefono] ?? ''),
    empresa,
  )
  const vista = vistaDelPais(
    escrito,
    campoPais ? { etiqueta: campoPais.etiqueta, valor: elegido } : null,
  )

  return {
    linea: escrito ? lineaDelTelefono(escrito.numero, escrito.resuelto) : null,
    anuncio: vista.anuncio,
    campo:
      clave !== null && vista.opciones.length > 0
        ? {
            opciones: vista.opciones,
            elegido,
            etiquetaDelCampo: campoPais?.etiqueta ?? '',
            alElegir: (nombre: string) => {
              setEstado((antes) => conPaisElegido(antes, clave, nombre))
            },
          }
        : null,
    // Tipear el teléfono lleva «País» al del número; lo demás es un cambio común.
    cambiar: (claveDelCambio: string, valor: ValorDeFormulario) => {
      setEstado((antes) => {
        const siguiente = conCambio(antes, claveDelCambio, valor)
        if (claveDelCambio !== CLAVE_DEL_ALTA.telefono || clave === null || tabla === null) {
          return siguiente
        }
        const anterior = String(antes.valores[CLAVE_DEL_ALTA.telefono] ?? '')
        return conPaisDelTelefono(siguiente, {
          clave,
          inicial: String(iniciales[clave] ?? ''),
          anterior: paisDelEscrito(tabla, anterior, empresa)?.resuelto ?? null,
          ahora: paisDelEscrito(tabla, String(valor), empresa)?.resuelto ?? null,
        })
      })
    },
  }
}
