// Los datos de ejemplo que siembra `sembrar.mjs` en la demo y en la base local: personas, leads, vehículos y cotizaciones
// inventados, de listas fijas y sin azar (la misma corrida da siempre lo mismo). Nada de esto es de una persona real:
// - Los correos son del dominio reservado `.invalid` (RFC 2606): no existen ni reciben correo.
// - Los teléfonos son la serie de ficción `+591 7000 9NNN`, que ninguna prueba del repo usa (las de la base usan
//   `7000 00NN`; los e2e, `7` + el reloj): pasan `normalizar_telefono()` y nadie los confunde con uno de verdad.
// - Los VIN empiezan con `DEMXV`, que no es el prefijo de ningún fabricante.
// - Los ids son uuids fijos (`idDeDemo`): repetir la siembra repite el intento, y cada RPC devuelve lo que ya creó.
// Este archivo es puro (sin I/O): lo prueba `sembrar.test.ts`.
import { createHash } from 'node:crypto'

export const DOMINIO_DE_DEMO = 'demo.invalid'
export const CODIGO_DE_PAIS = '+591'
export const CANTIDAD_DE_LEADS = 30
export const CANTIDAD_DE_COTIZACIONES = 5
const DIA = 24 * 60 * 60 * 1000

// Un uuid fijo por cosa sembrada (forma de la versión 8, «a medida»): el mismo tipo y número dan siempre el mismo.
export function idDeDemo(tipo, n) {
  const h = createHash('sha256')
    .update(`importadora-demo/${tipo}/${String(n)}`)
    .digest('hex')
  const variante = (8 | (parseInt(h.charAt(16), 16) & 3)).toString(16)
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-8${h.slice(13, 16)}-${variante}${h.slice(17, 20)}-${h.slice(20, 32)}`
}

// El correo de la persona de demo de un rol: `<clave del rol>@demo.invalid`, en minúsculas y sin acentos.
export function correoDeDemo(claveDeRol) {
  const local = claveDeRol
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${local || 'persona'}@${DOMINIO_DE_DEMO}`
}

// Los nombres de las personas de demo, en el orden de los roles.
const PERSONAS = [
  'Lucía Antezana',
  'Jorge Villarroel',
  'Paola Céspedes',
  'Hernán Zeballos',
  'Ximena Torrico',
  'Rubén Montaño',
]
export const nombreDePersona = (i) => PERSONAS[i % PERSONAS.length] ?? 'Persona de demo'

const NOMBRES = [
  ['María', 'femenino'],
  ['Juan', 'masculino'],
  ['Carla', 'femenino'],
  ['Luis', 'masculino'],
  ['Daniela', 'femenino'],
  ['Carlos', 'masculino'],
  ['Gabriela', 'femenino'],
  ['Marco', 'masculino'],
  ['Patricia', 'femenino'],
  ['Diego', 'masculino'],
  ['Valeria', 'femenino'],
  ['Fernando', 'masculino'],
  ['Rosa', 'femenino'],
  ['Álvaro', 'masculino'],
  ['Andrea', 'femenino'],
  ['Rodrigo', 'masculino'],
  ['Mariela', 'femenino'],
  ['Mauricio', 'masculino'],
  ['Silvia', 'femenino'],
  ['Gonzalo', 'masculino'],
  ['Verónica', 'femenino'],
  ['Sergio', 'masculino'],
  ['Fernanda', 'femenino'],
  ['Wilfredo', 'masculino'],
  ['Ximena', 'femenino'],
  ['Hernán', 'masculino'],
  ['Lorena', 'femenino'],
  ['Rubén', 'masculino'],
  ['Cecilia', 'femenino'],
  ['Edwin', 'masculino'],
]
const APELLIDOS = [
  'Mamani',
  'Quispe',
  'Choque',
  'Condori',
  'Flores',
  'Rojas',
  'Vargas',
  'Gutiérrez',
  'Arce',
  'Suárez',
  'Justiniano',
  'Paz',
  'Céspedes',
  'Ribera',
  'Saavedra',
  'Antezana',
  'Villarroel',
  'Zeballos',
  'Aguilar',
  'Torrico',
  'Rocha',
  'Montaño',
  'Salvatierra',
]
const CIUDADES = [
  'Santa Cruz',
  'La Paz',
  'Cochabamba',
  'El Alto',
  'Sucre',
  'Tarija',
  'Oruro',
  'Montero',
  'Quillacollo',
  'Trinidad',
]
const INTERESES = [
  'Busca una vagoneta mediana para la familia, hasta 25.000 USD.',
  'Quiere cotizar una camioneta 4x4 para trabajo en el campo.',
  'Pregunta por autos híbridos de subasta.',
  'Le interesa un sedán automático, de 2019 en adelante.',
  'Quiere saber los plazos de llegada a Cochabamba.',
  'Compara precios con otra importadora; pide la cotización por escrito.',
]
const SEGUIMIENTOS = [
  'Primer contacto: pidió fotos y precio',
  'Le envié la cotización por WhatsApp',
  'Llamada: consulta por plazos de entrega',
  'Visitó la oficina con su familia',
  'Pidió opciones de financiamiento',
  'Quedó en confirmar después de revisar con su esposa',
]
const SEGUNDOS_SEGUIMIENTOS = [
  'Volvió a escribir: quiere ver más opciones',
  'Confirmó que sigue interesado',
]
const RECORDATORIOS = [
  'Llamar para confirmar la cotización',
  'Enviar fotos del vehículo nuevo',
  'Preguntar si decidió la compra',
]

const en = (lista, i) => lista[i % lista.length]

// El teléfono nacional del lead n (1 a 999): «7000 9001», «7000 9002»… Con el código de Bolivia queda 591700090NN.
export function telefonoDeDemo(n) {
  if (!Number.isInteger(n) || n < 1 || n > 999)
    throw new RangeError(`n tiene que ir de 1 a 999 (llegó ${String(n)})`)
  return `7000 9${String(n).padStart(3, '0')}`
}

// Los leads de la siembra, del 1 a `cantidad`. Lo que depende de la base (tipos, orígenes, campos) lo pone `pedidoDeLead()`.
export function leadsDeDemo(cantidad = CANTIDAD_DE_LEADS) {
  return Array.from({ length: cantidad }, (_, i) => {
    const n = i + 1
    const [nombre, genero] = en(NOMBRES, i)
    const paterno = en(APELLIDOS, i * 7)
    const materno =
      en(APELLIDOS, i * 11 + 5) === paterno ? en(APELLIDOS, i * 11 + 6) : en(APELLIDOS, i * 11 + 5)
    return {
      n,
      id: idDeDemo('lead', n),
      nombre: `${nombre} ${paterno} ${materno}`,
      telefono: telefonoDeDemo(n),
      genero,
      ciudad: en(CIUDADES, i),
      edad: 24 + ((i * 7) % 37),
      notas: en(INTERESES, i),
      esCliente: n % 4 === 0,
      // Casi todos con su primer contacto; unos pocos con un segundo y con un recordatorio pendiente.
      seguimiento: n % 5 === 0 ? null : { titulo: en(SEGUIMIENTOS, i), haceDias: 1 + (i % 20) },
      segundoSeguimiento:
        n % 6 === 1
          ? { id: idDeDemo('seguimiento', n), titulo: en(SEGUNDOS_SEGUIMIENTOS, i) }
          : null,
      recordatorio: n % 9 === 2 ? { titulo: en(RECORDATORIOS, i), enDias: 1 + (i % 6) } : null,
    }
  })
}

// Lo que se manda de los atributos: sólo los campos activos del layout, con un valor de su tipo (un `opcion` sólo con una de
// sus claves). Lo demás se omite y se dice: la siembra nunca inventa un campo ni una opción que la base no tiene.
export function atributosQueCaben(propuestos, campos) {
  const porClave = new Map(campos.filter((c) => c.activo).map((c) => [c.clave, c]))
  const atributos = {}
  const omitidos = []
  for (const [clave, valor] of Object.entries(propuestos)) {
    const campo = porClave.get(clave)
    if (campo && cabe(valor, campo)) atributos[clave] = valor
    else omitidos.push(clave)
  }
  return { atributos, omitidos }
}

function cabe(valor, campo) {
  switch (campo.tipo) {
    case 'texto':
    case 'texto_largo':
      return typeof valor === 'string' && valor.trim() !== ''
    case 'numero':
    case 'moneda':
      return typeof valor === 'number' && Number.isFinite(valor)
    case 'booleano':
      return typeof valor === 'boolean'
    case 'opcion':
      return (campo.opciones ?? []).some((o) => o.clave === valor)
    default:
      return false
  }
}

// Los campos del lead que el layout tiene y los requeridos que la siembra no sabe llenar (con alguno, no se siembran leads).
export function requeridosSinValor(campos, claves) {
  return campos
    .filter((c) => c.activo && c.requerido && !claves.includes(c.clave))
    .map((c) => c.clave)
}

// Los argumentos de `crear_lead()` para un lead: su tipo por clase (cliente o prospecto, nunca por nombre), su origen en ronda
// entre los activos y el primer seguimiento y el recordatorio, con fechas relativas a `ahora`.
export function pedidoDeLead(lead, { tipos, origenes, tiposDeSeguimiento, campos, ahora }) {
  const clase = lead.esCliente ? 'cliente' : 'prospecto'
  const tipo = tipos.find((t) => t.clase === clase) ?? tipos[0]
  const origen = origenes.length ? en(origenes, lead.n - 1) : null
  const { atributos } = atributosQueCaben(
    {
      ciudad: lead.ciudad,
      pais: 'Bolivia',
      edad: lead.edad,
      genero: lead.genero,
      notas: lead.notas,
    },
    campos,
  )
  const tipoDeSeguimiento = tiposDeSeguimiento.length ? en(tiposDeSeguimiento, lead.n - 1) : null
  const seguimiento =
    lead.seguimiento && tipoDeSeguimiento
      ? {
          tipo_id: tipoDeSeguimiento.id,
          titulo: lead.seguimiento.titulo,
          ocurrido_en: new Date(ahora.getTime() - lead.seguimiento.haceDias * DIA).toISOString(),
        }
      : null
  const recordatorio = lead.recordatorio
    ? {
        titulo: lead.recordatorio.titulo,
        recordar_en: new Date(ahora.getTime() + lead.recordatorio.enDias * DIA).toISOString(),
      }
    : null
  return {
    p_id: lead.id,
    p_lead: {
      nombre: lead.nombre,
      telefono_cc: CODIGO_DE_PAIS,
      telefono_principal: lead.telefono,
      ...(tipo ? { tipo_lead_id: tipo.id } : {}),
      ...(origen ? { origen_lead_id: origen.id } : {}),
      atributos,
    },
    p_seguimiento: seguimiento,
    p_recordatorio: recordatorio,
  }
}
