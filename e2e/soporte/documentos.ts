// El terreno de los e2e de documentos (6.06): el de mover (un origen `e2e_…` con A → B → C, un vehículo en B y el tipo «E2E BL <proyecto>» que pide C) y una persona que sólo puede subir:
// `logistica.ver`, `vehiculos.ver` y `logistica.documentos.subir` del origen, y otra que aprueba (`logistica.documentos.aprobar`, más `flujos.mover` para ver «Qué falta»).
import { CONTRASENA } from './alta'
import { correoDePrueba, crearPersona, darRolDePrueba, PREFIJO_ROL_E2E } from './base'
import { borrarMover, sembrarMover, type TerrenoDeMover } from './mover'

export type TerrenoDeDocumentos = TerrenoDeMover & {
  quienSube: { correo: string; nombre: string }
  quienAprueba: { correo: string; nombre: string }
}

export async function sembrarDocumentos(proyecto: string): Promise<TerrenoDeDocumentos> {
  const terreno = await sembrarMover(proyecto)
  const correo = correoDePrueba(`sube-documentos-${proyecto}`)
  const nombre = 'Sara Sube'
  await crearPersona({ email: correo, contrasena: CONTRASENA, nombre, invitada: true })
  await darRolDePrueba({
    email: correo,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}sube documentos ${proyecto}`,
      clave: `e2e_sube_documentos_${proyecto}`,
    },
    permisos: ['logistica.ver', 'vehiculos.ver', 'logistica.documentos.subir'].map((clave) => ({
      clave,
      origenId: terreno.origen.id,
    })),
  })
  const aprueba = correoDePrueba(`aprueba-documentos-${proyecto}`)
  const nombreDeQuienAprueba = 'Ana Aprueba'
  await crearPersona({
    email: aprueba,
    contrasena: CONTRASENA,
    nombre: nombreDeQuienAprueba,
    invitada: true,
  })
  await darRolDePrueba({
    email: aprueba,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}aprueba documentos ${proyecto}`,
      clave: `e2e_aprueba_documentos_${proyecto}`,
    },
    permisos: [
      'logistica.ver',
      'vehiculos.ver',
      'flujos.mover',
      'logistica.documentos.aprobar',
    ].map((clave) => ({
      clave,
      origenId: terreno.origen.id,
    })),
  })
  return {
    ...terreno,
    quienSube: { correo, nombre },
    quienAprueba: { correo: aprueba, nombre: nombreDeQuienAprueba },
  }
}

// Quita el terreno de mover (los documentos caen con los vehículos). Las personas y los roles los limpia el spec.
export const borrarDocumentos = borrarMover
