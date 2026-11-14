// Qué se sabe de antemano que la papelera va a rechazar, y cómo se ofrece «Enviar a la papelera» en cada caso. Lo que la base rechaza y la
// pantalla ya sabe se dice antes de intentar; lo demás (comprobante, documentos, dinero, aduana, repuestos) lo dice ella al intentar, con su
// causa (`papelera.ts` › `errorDeEnvio()`).
import { SIN_ACCIONES, type AccionesDeUnAviso } from '@/shared/lib/acciones-del-aviso'
import {
  accionesDeBloqueo,
  vehiculoDelAviso,
  type AlcanceDeAvisos,
  type CausaDeBloqueo,
} from './avisos-de-vehiculo'

// Una regla que frena el envío: su clave y su texto. Los textos son los de `_vehiculo_bloqueo()`.
export type BloqueoParaEnviar = {
  causa: Extract<CausaDeBloqueo, 'vinculado' | 'fase'>
  motivo: string
}

export function bloqueoParaEnviar(
  vehiculo: { leadId: string | null; faseId: string | null },
  fase: { nombre: string; esInicial: boolean } | null,
): BloqueoParaEnviar | null {
  if (vehiculo.leadId !== null) {
    return { causa: 'vinculado', motivo: 'Está vinculado a un lead. Quita el vínculo antes.' }
  }
  if (vehiculo.faseId !== null && fase && !fase.esInicial) {
    return {
      causa: 'fase',
      motivo: `Está en «${fase.nombre}». Sólo va a la papelera lo que sigue en su fase inicial.`,
    }
  }
  return null
}

export type PermisoDePapelera =
  // Sin `vehiculos.eliminar` sobre ese vehículo la acción no existe.
  | { estado: 'oculto' }
  // Apagada con su motivo y lo que se puede hacer ahí mismo (`acciones`: de 0 a 3, ya filtradas por permiso).
  | { estado: 'deshabilitado'; motivo: string; acciones: AccionesDeUnAviso }
  | { estado: 'habilitado' }

export function permisoDePapelera(
  puedeEliminar: boolean,
  bloqueo: BloqueoParaEnviar | null,
  acciones: AccionesDeUnAviso = SIN_ACCIONES,
): PermisoDePapelera {
  if (!puedeEliminar) {
    return { estado: 'oculto' }
  }
  return bloqueo === null
    ? { estado: 'habilitado' }
    : { estado: 'deshabilitado', motivo: bloqueo.motivo, acciones }
}

// «Enviar a la papelera» de un vehículo, con todo lo que la pantalla ya sabe: si no va, se ve apagada con su motivo y lo que se puede hacer ahí
// mismo (quitar el vínculo, ver el lead, ver en logística…). `editable` y `leadVisible` los resuelve la página con lo que decide la base.
export function papeleraDelVehiculo(pedido: {
  eliminable: boolean
  vehiculo: { id: string; leadId: string | null; faseId: string | null }
  fase: { nombre: string; esInicial: boolean } | null
  editable: boolean
  leadVisible: boolean
  alcance: AlcanceDeAvisos
}): PermisoDePapelera {
  const bloqueo = bloqueoParaEnviar(pedido.vehiculo, pedido.fase)
  return permisoDePapelera(
    pedido.eliminable,
    bloqueo,
    bloqueo === null
      ? SIN_ACCIONES
      : accionesDeBloqueo(bloqueo.causa, vehiculoDelAviso(pedido.vehiculo, pedido), pedido.alcance),
  )
}
