// El borrador del formulario «Nuevo proyecto» y su validación (8.09-1, C4 y C9). Puro. Un proyecto es **de un vehículo** (sólo se guarda el id: sus datos salen del vehículo) o
// **externo** (etiqueta, VIN opcional, y el cliente como texto libre o un lead). La base vuelve a revisarlo todo (`repuesto_proyecto_crear`).
import type { DatosDeProyecto } from './repositorio'

export type OrigenDelProyecto = 'vehiculo' | 'externo'

export const LARGO_MAXIMO_DE_ETIQUETA = 120
export const LARGO_MAXIMO_DE_VIN = 40
export const LARGO_MAXIMO_DE_CLIENTE = 120
export const LARGO_MAXIMO_DE_TELEFONO = 40
export const LARGO_MAXIMO_DE_NOTAS = 2000

/** Lo que escribe la persona, tal cual. Los ids de un buscador son `''` mientras no eligió. */
export type BorradorDeProyecto = {
  origen: OrigenDelProyecto
  vehiculoId: string
  vehiculoEtiqueta: string
  vin: string
  leadId: string
  clienteNombre: string
  clienteTelefono: string
  notas: string
}

export const BORRADOR_NUEVO_DE_PROYECTO: BorradorDeProyecto = {
  origen: 'externo',
  vehiculoId: '',
  vehiculoEtiqueta: '',
  vin: '',
  leadId: '',
  clienteNombre: '',
  clienteTelefono: '',
  notas: '',
}

export type ValidacionDeProyecto =
  { ok: true; datos: DatosDeProyecto } | { ok: false; errores: Record<string, string> }

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function opcional(texto: string): string | undefined {
  const limpio = texto.trim()
  return limpio === '' ? undefined : limpio
}

function conTope(errores: Record<string, string>, clave: string, texto: string, maximo: number) {
  if (texto.length > maximo) {
    errores[clave] = `Escribe hasta ${String(maximo)} caracteres.`
  }
}

/** Valida el formulario con las reglas de la base. El error de cada campo va por su clave del borrador; un campo vacío no se manda. */
export function validarProyecto(b: BorradorDeProyecto): ValidacionDeProyecto {
  const errores: Record<string, string> = {}
  const notas = b.notas.trim()
  conTope(errores, 'notas', notas, LARGO_MAXIMO_DE_NOTAS)
  if (b.origen === 'vehiculo') {
    if (!GUID.test(b.vehiculoId)) {
      errores['vehiculoId'] = 'Elige el vehículo.'
    }
    if (Object.keys(errores).length > 0) {
      return { ok: false, errores }
    }
    return { ok: true, datos: { vehiculoId: b.vehiculoId, notas: opcional(notas) } }
  }
  const etiqueta = b.vehiculoEtiqueta.trim()
  const vin = b.vin.trim()
  const cliente = b.clienteNombre.trim()
  const telefono = b.clienteTelefono.trim()
  if (etiqueta === '') {
    errores['vehiculoEtiqueta'] = 'Escribe qué vehículo es.'
  }
  conTope(errores, 'vehiculoEtiqueta', etiqueta, LARGO_MAXIMO_DE_ETIQUETA)
  conTope(errores, 'vin', vin, LARGO_MAXIMO_DE_VIN)
  conTope(errores, 'clienteNombre', cliente, LARGO_MAXIMO_DE_CLIENTE)
  conTope(errores, 'clienteTelefono', telefono, LARGO_MAXIMO_DE_TELEFONO)
  if (b.leadId !== '' && !GUID.test(b.leadId)) {
    errores['leadId'] = 'Elige el lead de la lista.'
  }
  if (Object.keys(errores).length > 0) {
    return { ok: false, errores }
  }
  return {
    ok: true,
    datos: {
      vehiculoEtiqueta: etiqueta,
      vin: opcional(vin),
      leadId: opcional(b.leadId),
      clienteNombre: opcional(cliente),
      clienteTelefono: opcional(telefono),
      notas: opcional(notas),
    },
  }
}
