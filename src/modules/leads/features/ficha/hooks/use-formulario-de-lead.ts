'use client'

import { useRegional } from '@/shared/ui/regional'
import { useMemo, useState } from 'react'
import type { ValorDeFormulario, ValoresDeFormulario } from '@/shared/lib/campos'
import { cambiosDeEstado } from '@/shared/lib/borrador'
import { useAtajo } from '@/shared/ui/atajos'
import { useBorradorDeEstado } from '@/shared/ui/use-borrador-de-estado'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import type { CampoDeLead } from '../../../entities/campo'
import { hayCambios, validarEdicion, valoresDeEdicion } from '../../../entities/edicion'
import { MENSAJE_DE_LEAD_NO_DISPONIBLE } from '../../../entities/ficha'
import type { TipoDeLeadEnCatalogo } from '../../../entities/catalogos'
import type { LeadDeFicha, OrigenConEstado } from '../../../entities/ficha'
import { conCambio, conMotivos, enEspera, limpio, trasRechazo } from './estado-del-formulario'
import { useGuardarLead } from './use-guardar-lead'

type Args = {
  ficha: LeadDeFicha
  // Los campos que se ofrecen (`camposEditables`).
  campos: readonly CampoDeLead[]
  origenes: readonly OrigenConEstado[]
  // Los tipos de lead, también los apagados (uno apagado que el lead ya tiene se conserva).
  tipos: readonly TipoDeLeadEnCatalogo[]
  zona: string
  // Cierra el panel: lo guardado (o lo que no tenía cambios) ya está.
  alGuardar: (sinCambios: boolean) => void
  // El lead dejó de verse (se revocó el acceso, se fue a la papelera): vuelve a leerlo el servidor.
  alPerderElLead: () => void
}

// El estado de editar la ficha de un lead: valida con el layout antes de enviar y pinta los motivos
// junto a cada campo, guarda un borrador de lo escrito, muestra el conflicto si otra persona lo
// cambió y, si se cae la conexión, conserva todo y reintenta al volver. Sólo viaja lo que cambió.
// El borrador de lo escrito (por lead): al volver a abrir el panel lo escrito reaparece, hasta que se guarda o se descarta.
function useBorradorDeLaFicha(
  ficha: LeadDeFicha,
  estado: ReturnType<typeof limpio>,
  iniciales: ValoresDeFormulario,
  setEstado: (cambio: (antes: ReturnType<typeof limpio>) => ReturnType<typeof limpio>) => void,
) {
  return useBorradorDeEstado({
    clave: `lead-${ficha.id}`,
    valores: estado.valores,
    guardado: iniciales,
    alReponer: (cambios) => {
      setEstado((antes) => ({ ...antes, valores: { ...antes.valores, ...cambios } }))
    },
    activo: true,
  })
}

export function useFormularioDeLead({
  ficha,
  campos,
  origenes,
  tipos,
  zona,
  alGuardar,
  alPerderElLead,
}: Args) {
  const { locale } = useRegional()
  const iniciales = useMemo(
    () => valoresDeEdicion(ficha, campos, zona, locale),
    [ficha, campos, zona, locale],
  )
  const [estado, setEstado] = useState(() => limpio(iniciales))
  const guardando = useGuardarLead()
  const borrador = useBorradorDeLaFicha(ficha, estado, iniciales, setEstado)

  async function enviar(): Promise<boolean> {
    if (guardando.enCurso) {
      return false
    }
    const validacion = validarEdicion({
      ficha,
      valores: estado.valores,
      iniciales,
      campos,
      origenes,
      tipos,
      zona,
      locale,
    })
    if (!validacion.ok) {
      setEstado((antes) => conMotivos(antes, validacion.porCampo))
      return false
    }
    // Sin cambios no hay nada que mandar: no se pide una versión nueva por nada.
    if (!hayCambios(validacion.cambios)) {
      borrador.limpiar()
      alGuardar(true)
      return true
    }
    const resultado = await guardando.guardar({
      id: ficha.id,
      actualizadoEnEsperado: ficha.actualizadoEn,
      cambios: validacion.cambios,
    })
    if (resultado.ok) {
      borrador.limpiar()
      alGuardar(false)
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

  // Al volver la conexión sale solo lo que quedó esperando, una vez: guardar lo ya guardado no es
  // un conflicto, así que no duplica ni choca consigo mismo.
  const enLinea = useReintentoAlVolver(estado.pendiente, () => enviar())
  useAtajo('guardar', () => void enviar())

  return {
    valores: estado.valores,
    errores: estado.errores,
    conflicto: estado.conflicto,
    aviso: estado.aviso,
    esperandoConexion: estado.pendiente !== null,
    enLinea,
    enCurso: guardando.enCurso,
    // Algo escrito que todavía no se guardó (un aviso que sale de la pantalla pregunta antes de irse).
    hayCambios: Object.keys(cambiosDeEstado(estado.valores, iniciales)).length > 0,
    cambiar: (clave: string, valor: ValorDeFormulario) => {
      setEstado((antes) => conCambio(antes, clave, valor))
    },
    enviar,
    // Antes de recargar la versión de otra persona: lo escrito se descarta a propósito.
    descartarBorrador: borrador.limpiar,
  }
}

export type FormularioDeLead = ReturnType<typeof useFormularioDeLead>
