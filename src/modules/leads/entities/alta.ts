// El alta rápida de un lead (docs/UX.md › Flujo 1): qué se pide arriba, qué va plegado en «Más
// datos», con qué arranca cada dato, y cómo se valida lo escrito. Es lo mismo en el navegador (para
// avisar antes de enviar) y lo que la base vuelve a comprobar (`crear_lead()`): los mismos motivos
// con el campo en el mismo lugar. Nada de esto sabe de React ni de Supabase.
import { z } from 'zod'
import {
  campoDeFormulario,
  deAtributo,
  esquemaDeValor,
  requerir,
  vacioDe,
  type CampoDeFormulario,
  type Dato,
  type ValoresDeFormulario,
} from '@/shared/lib/campos'
import { valorDefectoVigente, type CampoDeLead, type DatosDeLaEmpresa } from './campo'
import { validarRecordatorio } from './recordatorio'
import { normalizarTelefono } from './telefono'

// --- Lo que el drawer necesita de la base, en un viaje --------------------------------------------

export type OrigenDeLead = { id: string; clave: string; nombre: string }

export type TipoDeSeguimiento = { id: string; clave: string; nombre: string; icono: string | null }

export type ContextoDeAlta = {
  // El código de país de la empresa (`+` y 1 a 3 dígitos); sin él, el teléfono se pide con «+».
  telefonoCc: string | null
  // Sólo los activos, en su orden.
  origenes: OrigenDeLead[]
  tiposDeSeguimiento: TipoDeSeguimiento[]
  // El origen que esta persona usó la última vez, si sigue activo.
  ultimoOrigenId: string | null
  empresa: DatosDeLaEmpresa
}

const esquemaContexto = z.object({
  telefono_cc: z.string().nullable(),
  origenes: z.array(z.object({ id: z.guid(), clave: z.string(), nombre: z.string() })),
  tipos_seguimiento: z.array(
    z.object({ id: z.guid(), clave: z.string(), nombre: z.string(), icono: z.string().nullable() }),
  ),
  ultimo_origen_id: z.guid().nullable(),
  empresa: z.object({ ciudad: z.string().nullable(), pais: z.string().nullable() }),
})

// El `jsonb` de `lead_alta_contexto()`.
export function contextoDeAltaDesde(crudo: unknown): ContextoDeAlta {
  const c = esquemaContexto.parse(crudo)
  return {
    telefonoCc: c.telefono_cc,
    origenes: c.origenes,
    tiposDeSeguimiento: c.tipos_seguimiento.map((t) => ({ ...t })),
    ultimoOrigenId: c.ultimo_origen_id,
    empresa: c.empresa,
  }
}

// --- Las claves del formulario: las mismas que pone la base en el `hint` de un error ---------------

export const CLAVE_DEL_ALTA = {
  telefono: 'telefono_principal',
  nombre: 'nombre',
  origen: 'origen_lead_id',
  tipo: 'tipo',
  tipoDeSeguimiento: 'seguimiento.tipo_id',
  resumen: 'seguimiento.titulo',
  detalle: 'seguimiento.detalle',
  recordatorio: 'recordatorio.recordar_en',
} as const

export const claveDeAtributoDeAlta = (clave: string) => `atributos.${clave}`

// --- Los dos tipos de un lead (el enum `tipo_lead`) ------------------------------------------------

export const TIPOS_DEL_LEAD = ['prospecto', 'cliente'] as const
export type TipoDelLead = (typeof TIPOS_DEL_LEAD)[number]

export const TIPO_DEL_LEAD_POR_DEFECTO: TipoDelLead = 'prospecto'

export const ETIQUETA_DE_TIPO_DEL_LEAD: Record<TipoDelLead, string> = {
  prospecto: 'Prospecto',
  cliente: 'Cliente',
}

// --- Qué va arriba y qué va en «Más datos» ----------------------------------------------------------

export const LARGO_MAXIMO_DEL_NOMBRE = 120
export const LARGO_MAXIMO_DEL_RESUMEN = 120
export const LARGO_MAXIMO_DEL_DETALLE = 5000

// Los campos activos que se piden de entrada (los requeridos, aunque sean propios) y los que quedan
// plegados, cada grupo en el orden del layout.
export function camposDelAlta(layout: readonly CampoDeLead[]): {
  principales: CampoDeLead[]
  masDatos: CampoDeLead[]
} {
  const activos = layout.filter((campo) => campo.activo)
  return {
    principales: activos.filter((campo) => campo.requerido),
    masDatos: activos.filter((campo) => !campo.requerido),
  }
}

// El control de un campo del layout. Un privado lo dice en la etiqueta: quien crea queda en la
// cartera y es quien lo puede llenar.
export function campoDelAlta(campo: CampoDeLead): CampoDeFormulario {
  return campoDeFormulario(
    {
      etiqueta: campo.soloCartera ? `${campo.etiqueta} (solo la cartera)` : campo.etiqueta,
      tipo: campo.tipo,
      opciones: campo.opciones,
      requerido: campo.requerido,
    },
    undefined,
    claveDeAtributoDeAlta(campo.clave),
  )
}

// Con qué arranca el formulario: el último origen (o el primero activo), «prospecto», el primer
// tipo de seguimiento por orden, y el valor por defecto de cada campo activo (la ciudad de la
// empresa incluida).
export function valoresIniciales(
  contexto: ContextoDeAlta,
  layout: readonly CampoDeLead[],
  zona: string,
): ValoresDeFormulario {
  const valores: ValoresDeFormulario = {
    [CLAVE_DEL_ALTA.telefono]: '',
    [CLAVE_DEL_ALTA.nombre]: '',
    [CLAVE_DEL_ALTA.origen]: contexto.ultimoOrigenId ?? contexto.origenes[0]?.id ?? '',
    [CLAVE_DEL_ALTA.tipo]: TIPO_DEL_LEAD_POR_DEFECTO,
    [CLAVE_DEL_ALTA.tipoDeSeguimiento]: contexto.tiposDeSeguimiento[0]?.id ?? '',
    [CLAVE_DEL_ALTA.resumen]: '',
    [CLAVE_DEL_ALTA.detalle]: '',
    [CLAVE_DEL_ALTA.recordatorio]: '',
  }
  for (const campo of layout) {
    if (campo.activo) {
      valores[claveDeAtributoDeAlta(campo.clave)] = deAtributo(
        campo,
        valorDefectoVigente(campo, contexto.empresa),
        zona,
      )
    }
  }
  return valores
}

// Un valor del formulario como se lee: «Santa Cruz», «Sí», las etiquetas de las opciones.
function textoDeValor(campo: CampoDeLead, valor: ValoresDeFormulario[string] | undefined): string {
  if (valor === undefined || valor === null || valor === '') {
    return ''
  }
  if (typeof valor === 'boolean') {
    return valor ? 'Sí' : 'No'
  }
  const etiquetaDe = (clave: string) =>
    campo.opciones.find((opcion) => opcion.clave === clave)?.etiqueta ?? clave
  if (Array.isArray(valor)) {
    return valor.map(etiquetaDe).join(', ')
  }
  return campo.tipo === 'opcion' ? etiquetaDe(valor) : valor
}

const PRECARGADOS_A_LA_VISTA = 3

// El encabezado de «Más datos»: lo que ya viene cargado, para no tener que abrirlo. «Ciudad: Santa
// Cruz · País: Bolivia». Vacío si no hay nada.
export function resumenDePrecargados(
  masDatos: readonly CampoDeLead[],
  valores: ValoresDeFormulario,
): string {
  const cargados = masDatos
    .map((campo) => ({
      campo,
      texto: textoDeValor(campo, valores[claveDeAtributoDeAlta(campo.clave)]),
    }))
    .filter(({ texto }) => texto !== '')
  const visibles = cargados.slice(0, PRECARGADOS_A_LA_VISTA)
  const resto = cargados.length - visibles.length
  const partes = visibles.map(({ campo, texto }) => `${campo.etiqueta}: ${texto}`)
  const frase = partes.join(' · ')
  return resto > 0 ? `${frase} · y ${String(resto)} más` : frase
}

// --- Validar lo escrito ------------------------------------------------------------------------------

export type DatosDeAlta = {
  // Lo que se escribió, para que la base lo normalice con el código de país de la empresa.
  telefono: string
  nombre: string
  origenId: string | null
  tipo: TipoDelLead
  // Sólo lo que tiene valor, ya convertido a lo que guarda la base.
  atributos: Record<string, Exclude<Dato, null>>
  seguimiento: { tipoId: string; titulo: string; detalle: string | null } | null
  // El instante, en UTC.
  recordatorio: { recordarEn: string } | null
}

export type ValidacionDeAlta =
  | { ok: true; datos: DatosDeAlta }
  // El primer motivo de cada dato que no pasó, por su clave en el formulario.
  | { ok: false; porCampo: Record<string, string> }

type Entrada = {
  valores: ValoresDeFormulario
  // Todo el layout: acá sólo cuentan los activos.
  layout: readonly CampoDeLead[]
  contexto: ContextoDeAlta
  zona: string
  // «Ahora», ISO: se pasa para poder probarlo.
  ahora: string
  // Falso = sólo el paso de los datos del lead; verdadero = también el primer seguimiento.
  conSeguimiento: boolean
}

type Motivos = Record<string, string>

const texto = (valor: ValoresDeFormulario[string] | undefined) =>
  typeof valor === 'string' ? valor.trim() : ''

// Cada pieza escribe su motivo en `motivos` (por la clave del formulario) y devuelve lo que pudo
// leer; con un motivo escrito, ese dato no viaja.

function validarFijos(
  { valores, contexto }: Pick<Entrada, 'valores' | 'contexto'>,
  motivos: Motivos,
): { telefono: string; nombre: string; origenId: string | null; tipo: TipoDelLead | null } {
  const telefono = texto(valores[CLAVE_DEL_ALTA.telefono])
  const normalizado = normalizarTelefono(contexto.telefonoCc, telefono)
  if (!normalizado.ok) {
    motivos[CLAVE_DEL_ALTA.telefono] = normalizado.motivo
  }
  const nombre = texto(valores[CLAVE_DEL_ALTA.nombre])
  if (nombre === '') {
    motivos[CLAVE_DEL_ALTA.nombre] = 'Escribe el nombre.'
  } else if (nombre.length > LARGO_MAXIMO_DEL_NOMBRE) {
    motivos[CLAVE_DEL_ALTA.nombre] =
      `El nombre admite hasta ${String(LARGO_MAXIMO_DEL_NOMBRE)} caracteres.`
  }
  const origen = texto(valores[CLAVE_DEL_ALTA.origen])
  const hayOrigenes = contexto.origenes.length > 0
  const origenValido = contexto.origenes.some((o) => o.id === origen)
  if (hayOrigenes && !origenValido) {
    motivos[CLAVE_DEL_ALTA.origen] = 'Elige de dónde viene el lead.'
  }
  const tipoEscrito = texto(valores[CLAVE_DEL_ALTA.tipo])
  const tipo = TIPOS_DEL_LEAD.find((uno) => uno === tipoEscrito) ?? null
  if (!tipo) {
    motivos[CLAVE_DEL_ALTA.tipo] = 'Elige el tipo de lead.'
  }
  return { telefono, nombre, origenId: hayOrigenes && origenValido ? origen : null, tipo }
}

function validarAtributos(
  { valores, layout, zona }: Pick<Entrada, 'valores' | 'layout' | 'zona'>,
  motivos: Motivos,
): DatosDeAlta['atributos'] {
  const atributos: DatosDeAlta['atributos'] = {}
  for (const campo of layout) {
    if (!campo.activo) {
      continue
    }
    const clave = claveDeAtributoDeAlta(campo.clave)
    const base = esquemaDeValor(campo, { zona })
    const leido = (campo.requerido ? requerir(base) : base).safeParse(
      valores[clave] ?? vacioDe(campo),
    )
    if (!leido.success) {
      motivos[clave] = leido.error.issues[0]?.message ?? 'Revisa este dato.'
    } else if (leido.data !== null) {
      atributos[campo.clave] = leido.data
    }
  }
  return atributos
}

function validarSeguimiento(
  { valores, contexto }: Pick<Entrada, 'valores' | 'contexto'>,
  motivos: Motivos,
): NonNullable<DatosDeAlta['seguimiento']> {
  const tipoId = texto(valores[CLAVE_DEL_ALTA.tipoDeSeguimiento])
  if (!contexto.tiposDeSeguimiento.some((t) => t.id === tipoId)) {
    motivos[CLAVE_DEL_ALTA.tipoDeSeguimiento] = 'Elige un tipo de seguimiento.'
  }
  const titulo = texto(valores[CLAVE_DEL_ALTA.resumen])
  if (titulo === '') {
    motivos[CLAVE_DEL_ALTA.resumen] = 'Escribe un resumen del seguimiento.'
  } else if (titulo.length > LARGO_MAXIMO_DEL_RESUMEN) {
    motivos[CLAVE_DEL_ALTA.resumen] =
      `El resumen admite hasta ${String(LARGO_MAXIMO_DEL_RESUMEN)} caracteres.`
  }
  const detalle = texto(valores[CLAVE_DEL_ALTA.detalle])
  if (detalle.length > LARGO_MAXIMO_DEL_DETALLE) {
    motivos[CLAVE_DEL_ALTA.detalle] =
      `El detalle admite hasta ${String(LARGO_MAXIMO_DEL_DETALLE)} caracteres.`
  }
  return { tipoId, titulo, detalle: detalle === '' ? null : detalle }
}

function validarRecordatorioDelAlta(
  { valores, ahora, zona }: Pick<Entrada, 'valores' | 'ahora' | 'zona'>,
  motivos: Motivos,
): DatosDeAlta['recordatorio'] {
  const cuando = texto(valores[CLAVE_DEL_ALTA.recordatorio])
  if (cuando === '') {
    return null
  }
  const valido = validarRecordatorio(cuando, ahora, zona)
  if (!valido.ok) {
    motivos[CLAVE_DEL_ALTA.recordatorio] = valido.motivo
    return null
  }
  return { recordarEn: valido.recordarEn }
}

export function validarAlta(entrada: Entrada): ValidacionDeAlta {
  const porCampo: Motivos = {}
  const fijos = validarFijos(entrada, porCampo)
  const atributos = validarAtributos(entrada, porCampo)
  const seguimiento = entrada.conSeguimiento ? validarSeguimiento(entrada, porCampo) : null
  const recordatorio = entrada.conSeguimiento ? validarRecordatorioDelAlta(entrada, porCampo) : null
  if (Object.keys(porCampo).length > 0 || !fijos.tipo) {
    return { ok: false, porCampo }
  }
  const { telefono, nombre, origenId, tipo } = fijos
  return {
    ok: true,
    datos: { telefono, nombre, origenId, tipo, atributos, seguimiento, recordatorio },
  }
}

// El orden en que se recorre el formulario, para llevar el foco al primer error.
export function primerCampoConError(
  porCampo: Record<string, string>,
  layout: readonly CampoDeLead[],
): string | null {
  const orden: string[] = [
    CLAVE_DEL_ALTA.telefono,
    CLAVE_DEL_ALTA.nombre,
    CLAVE_DEL_ALTA.origen,
    CLAVE_DEL_ALTA.tipo,
    ...layout.filter((c) => c.activo && c.requerido).map((c) => claveDeAtributoDeAlta(c.clave)),
    ...layout.filter((c) => c.activo && !c.requerido).map((c) => claveDeAtributoDeAlta(c.clave)),
    CLAVE_DEL_ALTA.tipoDeSeguimiento,
    CLAVE_DEL_ALTA.resumen,
    CLAVE_DEL_ALTA.detalle,
    CLAVE_DEL_ALTA.recordatorio,
  ]
  return orden.find((clave) => porCampo[clave] !== undefined) ?? null
}
