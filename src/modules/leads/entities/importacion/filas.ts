// Preparar las filas de un archivo: cada una se lee, se convierte y se valida con las **mismas reglas del
// alta** (`validarAlta()`), y queda lista o con sus motivos. Cada fila vale por sí misma. Sin I/O.
//
// - Nombre, teléfono, tipo y origen, más los campos activos requeridos, como en el alta.
// - El teléfono lo normaliza la base con el código de país de la empresa; acá se avisa con el mismo
//   espejo. Un número en notación científica (Excel lo hizo) se rechaza diciendo cómo arreglarlo.
// - Tipo: por nombre o clave entre los tipos de lead **activos** (uno desconocido o apagado es un error de esa fila: no se crea
//   uno al vuelo y el motivo lista los activos) o, si no hay columna o la celda está vacía, el elegido para todo el archivo.
// - Origen: por nombre entre los orígenes **activos** (uno desconocido es un error de esa fila: no se
//   crea uno al vuelo) o, si no hay columna o la celda está vacía, el elegido para todo el archivo.
// - Un teléfono repetido dentro del archivo se marca desde su segunda aparición. Si ya existe en la
//   base no se sabe acá: se dice al importar, fila por fila, sin nombrar a nadie.
import type { Dato, ValoresDeFormulario } from '@/shared/lib/campos'
import { CLAVE_DEL_ALTA, validarAlta } from '../alta'
import type { ContextoDeImportacion } from './contexto'
import type { CampoDeLead } from '../campo'
import type { TablaDePaises } from '../paises/resolver'
import { valorDeFormularioDesdeTexto } from './convertir'
import { completarPaisDeLaFila } from './pais'
import {
  origenDeLaCelda,
  tipoDeLaCelda,
  motivoDeOrigenDesconocido,
  motivoDeTipoDesconocido,
} from './catalogo'
import { marcarRepetido } from './repetidos'
import { esNotacionCientifica, sinApostrofoDeFormula } from './texto'

export { motivoDeOrigenDesconocido, motivoDeTipoDesconocido } from './catalogo'

export type MotivoDeFila = {
  // El id del objetivo (`nombre`, `telefono_principal`, `atributos.ciudad`…), o `null` si es de la fila.
  campo: string | null
  motivo: string
}

// Lo que viaja a la base por cada fila válida.
export type PedidoDeFila = {
  id: string
  // La fila del archivo (la 1 son los encabezados).
  fila: number
  lead: {
    nombre: string
    telefono_principal: string
    tipo_lead_id: string
    origen_lead_id: string | null
    atributos: Record<string, Exclude<Dato, null>>
  }
}

export type FilaPreparada = {
  // El id del intento: se genera al armar la vista previa y no cambia en los reintentos.
  id: string
  fila: number
  celdas: readonly string[]
  // Para mostrarla (de la celda de nombre).
  nombre: string
  motivos: readonly MotivoDeFila[]
  // Nulo si tiene motivos.
  pedido: PedidoDeFila | null
  // El país que salió del teléfono porque «País» venía vacío; nulo si la celda traía uno o no se pudo.
  paisDelTelefono: string | null
}

export type EleccionParaTodoElArchivo = {
  // Lo que se usa si el archivo no trae columna de origen o la celda viene vacía.
  origenId: string | null
  // El tipo para las filas sin tipo: uno de los activos (el que propone el alta, por defecto).
  tipoLeadId: string
}

export type EntradaDePreparacion = {
  filas: readonly (readonly string[])[]
  // Por columna del archivo, el id del objetivo o `null`.
  destinos: readonly (string | null)[]
  campos: readonly CampoDeLead[]
  contexto: ContextoDeImportacion
  zona: string
  // El de la empresa: con él se escriben los números del archivo y los lee el alta (4.13-3c). Obligatorio.
  locale: string
  eleccion: EleccionParaTodoElArchivo
  // La tabla de países, para completar «País» con el del teléfono. Sin ella (todavía no llegó) no se
  // completa nada.
  paises?: TablaDePaises | null
  // Para probarlo; en la app, `crypto.randomUUID`.
  nuevoId: () => string
}

const PREFIJO_DE_ATRIBUTO = 'atributos.'

type Lectura = { valores: ValoresDeFormulario; propios: Map<string, string> }

type ContextoDeLectura = {
  entrada: EntradaDePreparacion
  campos: ReadonlyMap<string, CampoDeLead>
}

const MOTIVO_DE_NOTACION_CIENTIFICA =
  'El teléfono llegó en notación científica (Excel lo convirtió). Pon la columna como texto y vuelve a subir el archivo.'

function leerTelefono(texto: string, { valores, propios }: Lectura): void {
  if (esNotacionCientifica(texto)) {
    propios.set(CLAVE_DEL_ALTA.telefono, MOTIVO_DE_NOTACION_CIENTIFICA)
  }
  valores[CLAVE_DEL_ALTA.telefono] = texto
}

function leerTipo(
  texto: string,
  { entrada }: ContextoDeLectura,
  { valores, propios }: Lectura,
): void {
  const tipo = texto === '' ? entrada.eleccion.tipoLeadId : tipoDeLaCelda(entrada.contexto, texto)
  if (tipo === null) {
    propios.set(CLAVE_DEL_ALTA.tipo, motivoDeTipoDesconocido(texto, entrada.contexto))
  }
  valores[CLAVE_DEL_ALTA.tipo] = tipo ?? ''
}

function leerOrigen(
  texto: string,
  { entrada }: ContextoDeLectura,
  { valores, propios }: Lectura,
): void {
  const origen = texto === '' ? entrada.eleccion.origenId : origenDeLaCelda(entrada.contexto, texto)
  if (origen === null && texto !== '') {
    propios.set(CLAVE_DEL_ALTA.origen, motivoDeOrigenDesconocido(texto, entrada.contexto))
  }
  valores[CLAVE_DEL_ALTA.origen] = origen ?? ''
}

function leerAtributo(
  destino: string,
  celda: string,
  { campos, entrada }: ContextoDeLectura,
  { valores, propios }: Lectura,
): void {
  const campo = campos.get(destino.slice(PREFIJO_DE_ATRIBUTO.length))
  if (!campo) {
    return
  }
  const conversion = valorDeFormularioDesdeTexto(campo, celda, entrada.locale)
  if (conversion.ok) {
    valores[destino] = conversion.valor
  } else {
    propios.set(destino, conversion.motivo)
  }
}

// Lee una celda al formulario del alta; lo que no se puede leer deja su motivo y el dato vacío.
function leerCelda(
  destino: string,
  celda: string,
  contexto: ContextoDeLectura,
  lectura: Lectura,
): void {
  const texto = sinApostrofoDeFormula(celda).trim()
  if (destino === CLAVE_DEL_ALTA.nombre) {
    lectura.valores[destino] = texto
  } else if (destino === CLAVE_DEL_ALTA.telefono) {
    leerTelefono(texto, lectura)
  } else if (destino === CLAVE_DEL_ALTA.tipo) {
    leerTipo(texto, contexto, lectura)
  } else if (destino === CLAVE_DEL_ALTA.origen) {
    leerOrigen(texto, contexto, lectura)
  } else if (destino.startsWith(PREFIJO_DE_ATRIBUTO)) {
    leerAtributo(destino, celda, contexto, lectura)
  }
}

function valoresDeLaFila(
  celdas: readonly string[],
  entrada: EntradaDePreparacion,
  campos: ReadonlyMap<string, CampoDeLead>,
): Lectura {
  const lectura: Lectura = {
    valores: {
      [CLAVE_DEL_ALTA.tipo]: entrada.eleccion.tipoLeadId,
      [CLAVE_DEL_ALTA.origen]: entrada.eleccion.origenId ?? '',
    },
    propios: new Map(),
  }
  for (const [columna, destino] of entrada.destinos.entries()) {
    if (destino !== null) {
      leerCelda(destino, celdas[columna] ?? '', { entrada, campos }, lectura)
    }
  }
  return lectura
}

function prepararFila(
  celdas: readonly string[],
  numero: number,
  entrada: EntradaDePreparacion,
  campos: ReadonlyMap<string, CampoDeLead>,
): FilaPreparada {
  const id = entrada.nuevoId()
  const { valores, propios } = valoresDeLaFila(celdas, entrada, campos)
  const paisDelTelefono = completarPaisDeLaFila({
    valores,
    propios,
    campos,
    contexto: entrada.contexto,
    tabla: entrada.paises ?? null,
  })
  const validacion = validarAlta({
    valores,
    layout: entrada.campos,
    contexto: entrada.contexto,
    zona: entrada.zona,
    locale: entrada.locale,
  })
  const porCampo = new Map(validacion.ok ? [] : Object.entries(validacion.porCampo))
  // Un dato que no se pudo leer ya dice por qué: no se repite con «es obligatorio».
  for (const [campo, motivo] of propios) {
    porCampo.set(campo, motivo)
  }
  const motivos = [...porCampo].map(([campo, motivo]) => ({ campo, motivo }))
  const nombre =
    typeof valores[CLAVE_DEL_ALTA.nombre] === 'string' ? valores[CLAVE_DEL_ALTA.nombre] : ''
  if (!validacion.ok || motivos.length > 0) {
    return {
      id,
      fila: numero,
      celdas,
      nombre: String(nombre),
      motivos,
      pedido: null,
      paisDelTelefono,
    }
  }
  const { datos } = validacion
  return {
    id,
    fila: numero,
    celdas,
    nombre: datos.nombre,
    motivos: [],
    paisDelTelefono,
    pedido: {
      id,
      fila: numero,
      lead: {
        nombre: datos.nombre,
        telefono_principal: datos.telefono,
        tipo_lead_id: datos.tipoLeadId,
        origen_lead_id: datos.origenId,
        atributos: datos.atributos,
      },
    },
  }
}

// Preparar por tramos (9.06-4b, la importación total de `/datos` convierte 20.000 filas sin trabar la pantalla): arma una vez el mapa de
// campos y lo visto de teléfonos, que cruza las llamadas. Cada llamada numera desde `desde` (la fila `desde + i + 2` del archivo) y marca los
// repetidos contra todo lo anterior. **Las llamadas van en orden y sin saltos:** así el resultado es idéntico al de una sola pasada.
export function preparadorDeFilas(
  entrada: Omit<EntradaDePreparacion, 'filas'>,
): (filas: EntradaDePreparacion['filas'], desde: number) => FilaPreparada[] {
  const completa = { ...entrada, filas: [] }
  const campos = new Map(
    entrada.campos.filter((campo) => campo.activo).map((campo) => [campo.clave, campo]),
  )
  const vistos = new Map<string, number>()
  return (filas, desde) => {
    const preparadas = filas.map((celdas, i) =>
      prepararFila(celdas, desde + i + 2, completa, campos),
    )
    return preparadas.map((fila) => marcarRepetido(fila, vistos, entrada.contexto.telefonoCc))
  }
}

// Las filas de datos (la primera es la fila 2 del archivo), cada una con su id de intento.
export function prepararFilas(entrada: EntradaDePreparacion): FilaPreparada[] {
  return preparadorDeFilas(entrada)(entrada.filas, 0)
}
