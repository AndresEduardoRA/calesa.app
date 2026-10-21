'use client'

import { MasAcciones, type AccionDeMenu } from '@/shared/ui/lista'
import {
  MOTIVO_CUENTA_PROPIA,
  accionesSobre,
  nombreDePersona,
  type AccionesSobrePersona,
  type PersonaDelEquipo,
} from '../../../entities/persona'

// Lo que la lista hace con una persona: quien dibuja la lista lo da una vez y cada fila lo usa.
export type AccionesDeLaLista = {
  yoId: string
  // Sin el permiso de gestionar no hay «⋯»: sólo se lee.
  puedeGestionar: boolean
  deshabilitado: boolean
  alVerRoles: (persona: PersonaDelEquipo) => void
  alCambiarBloqueo: (persona: PersonaDelEquipo, bloquear: boolean) => void
  alDarDeBaja: (persona: PersonaDelEquipo) => void
  alGenerarEnlace: (persona: PersonaDelEquipo) => void
}

// Las líneas del «⋯» de una persona, en su orden. Lo que no aplica a su estado no aparece; sobre la cuenta propia se dice por qué no se la
// puede bloquear ni dar de baja. Mientras algo está en curso las acciones se apagan (el botón sigue: quien lo abre lee por qué).
export function lineasDeLaPersona(
  acciones: AccionesSobrePersona,
  deshabilitado: boolean,
  hacer: {
    verRoles: () => void
    cambiarBloqueo: (bloquear: boolean) => void
    darDeBaja: () => void
    generarEnlace: () => void
  },
): AccionDeMenu[] {
  const lineas: AccionDeMenu[] = []
  if (acciones.roles) {
    lineas.push({
      tipo: 'accion',
      clave: 'roles',
      etiqueta: 'Cambiar sus roles',
      deshabilitada: deshabilitado,
      despuesDeCerrar: true,
      alElegir: hacer.verRoles,
    })
  }
  if (acciones.enlace) {
    lineas.push({
      tipo: 'accion',
      clave: 'enlace',
      etiqueta: 'Generar otro enlace de invitación',
      deshabilitada: deshabilitado,
      alElegir: hacer.generarEnlace,
    })
  }
  if (acciones.bloqueo) {
    const bloquear = acciones.bloqueo === 'bloquear'
    lineas.push({
      tipo: 'accion',
      clave: 'bloqueo',
      etiqueta: bloquear ? 'Bloquear' : 'Desbloquear',
      deshabilitada: deshabilitado,
      alElegir: () => {
        hacer.cambiarBloqueo(bloquear)
      },
    })
  }
  if (acciones.baja) {
    lineas.push(
      { tipo: 'separador', clave: 'separador-de-baja' },
      {
        tipo: 'accion',
        clave: 'baja',
        etiqueta: 'Dar de baja',
        destructiva: true,
        deshabilitada: deshabilitado,
        despuesDeCerrar: true,
        alElegir: hacer.darDeBaja,
      },
    )
  }
  if (acciones.esPropia) {
    lineas.push({ tipo: 'nota', clave: 'cuenta-propia', texto: MOTIVO_CUENTA_PROPIA })
  }
  return lineas
}

type Props = { persona: PersonaDelEquipo; lista: AccionesDeLaLista }

// El «⋯» de una persona («Más acciones de …», como en toda lista). Quien sólo ve el equipo, y una persona dada de baja, no lo tienen.
export function MenuDePersona({ persona, lista }: Props) {
  if (!lista.puedeGestionar || persona.estado === 'baja') {
    return null
  }
  return (
    <MasAcciones
      nombre={nombreDePersona(persona)}
      acciones={lineasDeLaPersona(accionesSobre(persona, lista.yoId), lista.deshabilitado, {
        verRoles: () => {
          lista.alVerRoles(persona)
        },
        cambiarBloqueo: (bloquear) => {
          lista.alCambiarBloqueo(persona, bloquear)
        },
        darDeBaja: () => {
          lista.alDarDeBaja(persona)
        },
        generarEnlace: () => {
          lista.alGenerarEnlace(persona)
        },
      })}
    />
  )
}
