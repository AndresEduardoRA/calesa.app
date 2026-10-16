// Qué muestra el drawer rápido de un lead: en «Resumen», los datos que le llegaron a quien mira,
// agrupados como el layout; en «Seguimientos», la línea de tiempo y «Tus recordatorios», con anotar y
// agendar (`?pestana=seguimientos`). Editar el lead sigue siendo de la ficha.
import { agruparCampos } from '@/shared/lib/campos'
import type { CampoDeLead } from './campo'
import type { FilaDeLead } from './listado'

export type DatoDelRapido = { campo: CampoDeLead; valor: unknown }
export type GrupoDelRapido = { nombre: string | null; datos: DatoDelRapido[] }

const esVacio = (valor: unknown) =>
  valor === undefined ||
  valor === null ||
  valor === '' ||
  (Array.isArray(valor) && valor.length === 0)

// Los campos activos con un valor, agrupados en el orden del layout. Un privado ajeno no llega en
// `atributos`, así que ni su etiqueta aparece: no se anuncia lo que quien mira no recibe.
export function gruposDelRapido(
  campos: readonly CampoDeLead[],
  atributos: Readonly<Record<string, unknown>>,
): GrupoDelRapido[] {
  return agruparCampos(campos).flatMap((grupo) => {
    const datos = grupo.campos.flatMap((campo) => {
      const valor = atributos[campo.clave]
      return esVacio(valor) ? [] : [{ campo, valor }]
    })
    return datos.length === 0 ? [] : [{ nombre: grupo.nombre, datos }]
  })
}

// Si hay datos que sólo recibe la cartera y quien mira no está en ella: se dice sin nombrarlos.
export function hayPrivadosSinRecibir(campos: readonly CampoDeLead[], enCartera: boolean): boolean {
  return !enCartera && campos.some((campo) => campo.activo && campo.soloCartera)
}

// Cómo está la lectura del lead abierto. `no_disponible` junta lo que no existe, lo que está en la
// papelera o en el limbo y lo que quien mira ya no ve: no se distingue nada (no es un oráculo).
export type LecturaDelRapido =
  | { id: string; estado: 'listo'; lead: FilaDeLead }
  | { id: string; estado: 'no_disponible' }
  | { id: string; estado: 'error' }

export type VistaDelRapido =
  // Hay que decir que ya no está: no existe, está en la papelera o en el limbo, o ya no lo ve.
  | { tipo: 'no_disponible' }
  // No se pudo leer y no hay nada que mostrar todavía.
  | { tipo: 'error' }
  // El lead: `completo` cuando ya llegó la lectura (antes sólo se sabe lo de la fila de la página);
  // `fallo` si la última relectura no pudo.
  | { tipo: 'lead'; lead: FilaDeLead; completo: boolean; fallo: boolean }
  | { tipo: 'cargando' }

type EntradaDeVista = {
  // El valor de `?lead=` y si es un id válido.
  id: string | null
  idValido: boolean
  lectura: LecturaDelRapido | null
  // La fila de la página, si el lead está en ella.
  delListado: FilaDeLead | null
  // Quien mira sólo ve su cartera: un lead que no es de ella no se muestra aunque llegue.
  soloMios: boolean
}

// Qué dibuja el drawer según lo que se sabe. Un lead que desaparece o deja de ser visible
// mientras está abierto cae en `no_disponible`, con el mismo texto sea cual sea el motivo.
export function vistaDelRapido(entrada: EntradaDeVista): VistaDelRapido {
  const { id, idValido, lectura, delListado, soloMios } = entrada
  if (id === null) {
    return { tipo: 'cargando' }
  }
  if (!idValido || lectura?.estado === 'no_disponible') {
    return { tipo: 'no_disponible' }
  }
  if (lectura?.estado === 'listo') {
    return soloMios && !lectura.lead.enCartera
      ? { tipo: 'no_disponible' }
      : { tipo: 'lead', lead: lectura.lead, completo: true, fallo: false }
  }
  const fallo = lectura?.estado === 'error'
  if (delListado !== null) {
    return { tipo: 'lead', lead: delListado, completo: false, fallo }
  }
  return fallo ? { tipo: 'error' } : { tipo: 'cargando' }
}

// Las pestañas del drawer (`?pestana=`). «Resumen» no va a la URL: es la de siempre.
export const CLAVE_DE_PESTANA = 'pestana'
export const PESTANAS_DEL_RAPIDO = [
  { clave: 'resumen', titulo: 'Resumen' },
  { clave: 'seguimientos', titulo: 'Seguimientos' },
] as const
export type PestanaDelRapido = (typeof PESTANAS_DEL_RAPIDO)[number]['clave']

// La de la URL; lo que no es una pestaña que existe abre «Resumen».
export function pestanaDelRapido(valor: string | null): PestanaDelRapido {
  return PESTANAS_DEL_RAPIDO.find((p) => p.clave === valor)?.clave ?? 'resumen'
}
