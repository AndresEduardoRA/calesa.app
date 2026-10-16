'use client'

import { useAction } from 'next-safe-action/hooks'
import { CLAVE_DEL_ALTA, type ContextoDeAlta } from '../../../entities/alta'
import { telefonoParaMostrar } from '../../../entities/telefono'
import { avisoDeVerificacion } from '../../../entities/verificacion'
import { useVerificarTelefono } from '../../telefono/hooks/use-verificar-telefono'
import { verificarTelefono } from '../actions/verificar-telefono'
import type { Estado } from './estado-del-alta'

type Args = { contexto: ContextoDeAlta; estado: Estado; abierto: boolean }

// El teléfono del alta, verificado al tipear (sólo con el drawer abierto y en el paso de los datos), y
// si «Tomar lead» sigue valiendo: sólo mientras el teléfono siga sin dueño.
export function useVerificacionDelAlta({ contexto, estado, abierto }: Args) {
  const { executeAsync: preguntar } = useAction(verificarTelefono)
  const verificacion = useVerificarTelefono({
    telefono: String(estado.valores[CLAVE_DEL_ALTA.telefono] ?? ''),
    codigoDePais: contexto.telefonoCc,
    activo: abierto && estado.paso === 'datos',
    consultar: async (telefono) => {
      const respuesta = await preguntar({ telefono })
      return respuesta.data?.ok ? respuesta.data.data : null
    },
  })
  const adoptar = estado.adoptar && verificacion.verificacion?.estado === 'limbo'
  return { verificacion, adoptar }
}

type Verificado = ReturnType<typeof useVerificacionDelAlta>

// Lo que la pantalla muestra del teléfono: el veredicto con su aviso, cómo va a quedar guardado
// («+54 91155550000 · Argentina», con el país si ya se sabe) y si «Tomar lead» sigue valiendo.
export function vistaDelTelefono(args: {
  verificacion: Verificado['verificacion']
  adoptar: boolean
  contexto: ContextoDeAlta
  linea: string | null
}) {
  const { verificacion, adoptar, contexto, linea } = args
  return {
    verificando: verificacion.verificando,
    verificacion: verificacion.verificacion,
    aviso: verificacion.verificacion ? avisoDeVerificacion(verificacion.verificacion) : null,
    comoSeGuarda:
      verificacion.numero === null
        ? null
        : (linea ?? telefonoParaMostrar(verificacion.numero, contexto.telefonoCc)),
    adoptar,
  }
}
