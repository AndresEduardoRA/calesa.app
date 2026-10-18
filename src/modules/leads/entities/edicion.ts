// Editar la ficha de un lead: qué campos se ofrecen, con qué arranca el formulario, cómo se valida
// lo escrito y qué viaja. Es lo mismo en el navegador (para avisar antes de enviar) y lo que la base
// vuelve a comprobar (`lead_guardar()`): los mismos motivos con el campo en el mismo lugar. Nada de
// esto sabe de React ni de Supabase.
import {
  campoDeFormulario,
  deAtributo,
  esquemaDeValor,
  requerir,
  vacioDe,
  type CampoDeFormulario,
  type Dato,
  type ValorDeFormulario,
  type ValoresDeFormulario,
} from '@/shared/lib/campos'
import { alcanceDe, type Permisos } from '@/shared/lib/permisos'
import { CLAVE_DEL_ALTA, LARGO_MAXIMO_DEL_NOMBRE, claveDeAtributoDeAlta } from './alta'
import type { TipoDeLeadEnCatalogo } from './catalogos'
import type { CampoDeLead } from './campo'
import type { LeadDeFicha, OrigenConEstado } from './ficha'

// Las claves del formulario son las que pone la base en el `hint` de un error.
export const CLAVE_DE_EDICION = {
  nombre: CLAVE_DEL_ALTA.nombre,
  origen: CLAVE_DEL_ALTA.origen,
  tipo: CLAVE_DEL_ALTA.tipo,
} as const

export const claveDeAtributoEnEdicion = claveDeAtributoDeAlta

// El valor de `?panel=` que abre la edición de la ficha.
export const PANEL_EDITAR_LEAD = 'editar-lead'

// ¿Puede editar este lead? Editar es contenido (clase 1 de la auditoría): exige tenerlo en la cartera
// **y** `leads.editar`, con cualquier alcance. «Todos» no basta: ve el lead pero no lo edita. La base
// lo vuelve a decidir (`lead_guardar()`): esto sólo gobierna si se dibuja el botón y se abre el panel.
export function puedeEditarLead(permisos: Permisos, enCartera: boolean): boolean {
  return enCartera && alcanceDe(permisos, 'leads.editar') !== null
}

// Los campos que se ofrecen: los activos. Sin la cartera no llegan los privados (la base los recorta):
// no se ofrecen. Hoy sólo se edita con la cartera, así que es la red por si cambia la regla.
export function camposEditables(layout: readonly CampoDeLead[], enCartera: boolean): CampoDeLead[] {
  return layout.filter((campo) => campo.activo && (enCartera || !campo.soloCartera))
}

// El control de un campo del layout, con su valor guardado (una opción que ya se sacó del campo se
// sigue ofreciendo). Un privado lo dice en la etiqueta.
export function campoDeEdicion(campo: CampoDeLead, guardado: unknown): CampoDeFormulario {
  return campoDeFormulario(
    {
      etiqueta: campo.soloCartera ? `${campo.etiqueta} (solo la cartera)` : campo.etiqueta,
      tipo: campo.tipo,
      opciones: campo.opciones,
      requerido: campo.requerido,
    },
    guardado,
    claveDeAtributoEnEdicion(campo.clave),
  )
}

// Con qué arranca el formulario: lo guardado, tal como se ve.
export function valoresDeEdicion(
  ficha: LeadDeFicha,
  campos: readonly CampoDeLead[],
  zona: string,
): ValoresDeFormulario {
  const valores: ValoresDeFormulario = {
    [CLAVE_DE_EDICION.nombre]: ficha.nombre,
    [CLAVE_DE_EDICION.origen]: ficha.origenId ?? '',
    [CLAVE_DE_EDICION.tipo]: ficha.tipoLeadId,
  }
  for (const campo of campos) {
    valores[claveDeAtributoEnEdicion(campo.clave)] = deAtributo(
      campo,
      ficha.atributos[campo.clave],
      zona,
    )
  }
  return valores
}

// Los orígenes que se ofrecen: los activos y, si el lead tiene uno apagado, ése (marcado) para
// poder conservarlo.
export function origenesOfrecidos(
  origenes: readonly OrigenConEstado[],
  origenActual: string | null,
): { id: string; nombre: string; activo: boolean }[] {
  return origenes
    .filter((origen) => origen.activo || origen.id === origenActual)
    .map(({ id, nombre, activo }) => ({ id, nombre, activo }))
}

// Lo que viaja: sólo lo que cambió. `atributos` es un parche: un valor pone o cambia, `null` quita.
export type CambiosDeLead = {
  nombre?: string
  tipoLeadId?: string
  origenId?: string | null
  atributos?: Record<string, Exclude<Dato, null> | null>
}

export type ValidacionDeEdicion =
  | { ok: true; cambios: CambiosDeLead }
  // El primer motivo de cada dato que no pasó, por su clave en el formulario.
  | { ok: false; porCampo: Record<string, string> }

type Entrada = {
  ficha: LeadDeFicha
  valores: ValoresDeFormulario
  // Con lo que arrancó el formulario: así se sabe qué cambió.
  iniciales: ValoresDeFormulario
  // Los campos que se ofrecieron (`camposEditables`).
  campos: readonly CampoDeLead[]
  origenes: readonly OrigenConEstado[]
  // Los tipos de lead, también los apagados (uno apagado que el lead ya tiene se conserva).
  tipos: readonly TipoDeLeadEnCatalogo[]
  zona: string
}

type Motivos = Record<string, string>

const texto = (valor: ValorDeFormulario | undefined) =>
  typeof valor === 'string' ? valor.trim() : ''

const mismo = (a: ValorDeFormulario | undefined, b: ValorDeFormulario | undefined) =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

function nombreDeEdicion({ ficha, valores }: Entrada, motivos: Motivos): CambiosDeLead {
  const nombre = texto(valores[CLAVE_DE_EDICION.nombre])
  if (nombre === '') {
    motivos[CLAVE_DE_EDICION.nombre] = 'Escribe el nombre.'
  } else if (nombre.length > LARGO_MAXIMO_DEL_NOMBRE) {
    motivos[CLAVE_DE_EDICION.nombre] =
      `El nombre admite hasta ${String(LARGO_MAXIMO_DEL_NOMBRE)} caracteres.`
  } else if (nombre !== ficha.nombre) {
    return { nombre }
  }
  return {}
}

// El tipo sólo se mira si cambió: uno apagado que el lead ya tiene se conserva, y pasar a otro apagado no se puede.
function tipoDeEdicion({ ficha, valores, tipos }: Entrada, motivos: Motivos): CambiosDeLead {
  const elegido = texto(valores[CLAVE_DE_EDICION.tipo])
  if (elegido === ficha.tipoLeadId) {
    return {}
  }
  const tipo = tipos.find((uno) => uno.id === elegido)
  if (elegido === '') {
    motivos[CLAVE_DE_EDICION.tipo] = 'Elige el tipo de lead.'
  } else if (!tipo) {
    motivos[CLAVE_DE_EDICION.tipo] = 'Ese tipo de lead ya no existe: elige otro.'
  } else if (!tipo.activo) {
    motivos[CLAVE_DE_EDICION.tipo] = 'Ese tipo de lead se desactivó: elige otro.'
  } else {
    return { tipoLeadId: tipo.id }
  }
  return {}
}

// El origen sólo se mira si cambió: uno apagado que el lead ya tiene se conserva.
function origenDeEdicion({ ficha, valores, origenes }: Entrada, motivos: Motivos): CambiosDeLead {
  const origen = texto(valores[CLAVE_DE_EDICION.origen])
  if (origen === (ficha.origenId ?? '')) {
    return {}
  }
  if (origen === '') {
    if (origenes.some((uno) => uno.activo)) {
      motivos[CLAVE_DE_EDICION.origen] = 'Elige de dónde viene el lead.'
      return {}
    }
    return { origenId: null }
  }
  if (!origenes.some((uno) => uno.id === origen && uno.activo)) {
    motivos[CLAVE_DE_EDICION.origen] = 'Ese origen del lead está desactivado o ya no existe.'
    return {}
  }
  return { origenId: origen }
}

// Cada campo ofrecido se valida entero (también el que no cambió: un requerido que se volvió
// obligatorio después de cargar el lead tiene que completarse antes de guardar, aunque lo único que
// se cambie sea el tipo) y sólo viaja si cambió.
function atributosDeEdicion(
  { valores, iniciales, campos, zona }: Entrada,
  motivos: Motivos,
): NonNullable<CambiosDeLead['atributos']> {
  const parche: NonNullable<CambiosDeLead['atributos']> = {}
  for (const campo of campos) {
    const clave = claveDeAtributoEnEdicion(campo.clave)
    const base = esquemaDeValor(campo, { zona })
    const leido = (campo.requerido ? requerir(base) : base).safeParse(
      valores[clave] ?? vacioDe(campo),
    )
    if (!leido.success) {
      motivos[clave] = leido.error.issues[0]?.message ?? 'Revisa este dato.'
    } else if (!mismo(valores[clave], iniciales[clave])) {
      parche[campo.clave] = leido.data
    }
  }
  return parche
}

export function validarEdicion(entrada: Entrada): ValidacionDeEdicion {
  const porCampo: Motivos = {}
  const fijos = {
    ...nombreDeEdicion(entrada, porCampo),
    ...tipoDeEdicion(entrada, porCampo),
    ...origenDeEdicion(entrada, porCampo),
  }
  const atributos = atributosDeEdicion(entrada, porCampo)
  if (Object.keys(porCampo).length > 0) {
    return { ok: false, porCampo }
  }
  return {
    ok: true,
    cambios: { ...fijos, ...(Object.keys(atributos).length > 0 ? { atributos } : {}) },
  }
}

export function hayCambios(cambios: CambiosDeLead): boolean {
  return Object.keys(cambios).length > 0
}

// El orden en que se recorre el formulario, para llevar el foco al primer error.
export function primerCampoConErrorDeEdicion(
  porCampo: Record<string, string>,
  campos: readonly CampoDeLead[],
): string | null {
  const orden: string[] = [
    CLAVE_DE_EDICION.nombre,
    CLAVE_DE_EDICION.tipo,
    CLAVE_DE_EDICION.origen,
    ...campos.map((campo) => claveDeAtributoEnEdicion(campo.clave)),
  ]
  return orden.find((clave) => porCampo[clave] !== undefined) ?? null
}
