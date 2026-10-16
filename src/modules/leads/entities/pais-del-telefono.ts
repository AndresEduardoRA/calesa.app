// El país de un teléfono, dicho a quien lo tipea y guardado en el campo «País» del lead. Reglas
// puras sobre el resultado de `paisDelNumero()`; la tabla se carga aparte (`paises/tabla.ts`) y
// llega como argumento, así que este archivo es chico y puede ir en el shell.
//
// - «+» o «00» al inicio: el número trae su país. Sin ellos es de la empresa y dice el suyo.
// - Si el número cae en la misma regla que el código de la empresa, se guarda **el texto de la
//   empresa** (la persona lo escribió así en Empresa › Región) y no el de la tabla: no hay dos
//   grafías del mismo país.
// - Un prefijo compartido (+1, +590) o desconocido no se adivina: no se guarda nada.
import { paisDelNumero, type OpcionDePais, type TablaDePaises } from './paises/resolver'

// La clave del campo de fábrica «País» en `leads_campos`. No cambia de clave ni de tipo.
export const CLAVE_DEL_PAIS = 'pais'

export const TEXTO_DE_CODIGO_DESCONOCIDO = 'Código de país desconocido'

export type PaisDeTelefono =
  | { tipo: 'pais'; nombre: string }
  | { tipo: 'varios'; opciones: readonly OpcionDePais[] }
  | { tipo: 'desconocido' }

export type TelefonoResuelto = {
  // El código de llamada con el que se parte el número; nulo si no se sabe.
  codigo: string | null
  pais: PaisDeTelefono
}

export type EmpresaDelTelefono = {
  telefonoCc: string | null | undefined
  pais: string | null | undefined
}

export type EntradaDelPais = {
  // Normalizado: sólo dígitos, con su código de país.
  numero: string
  // Trajo «+» o «00» (lo dice `normalizarTelefono()`).
  internacional: boolean
  empresa: EmpresaDelTelefono
}

const soloDigitos = (texto: string) => texto.replace(/\D/g, '')

// La misma regla = el mismo país, o el mismo prefijo compartido.
function mismaRegla(a: ReturnType<typeof paisDelNumero>, b: ReturnType<typeof paisDelNumero>) {
  if (a.tipo === 'pais' && b.tipo === 'pais') {
    return a.iso === b.iso
  }
  return a.tipo === 'varios' && b.tipo === 'varios' && a.codigo === b.codigo
}

// El código con el que se parte el número: el de la tabla o, si no lo conoce, el de la empresa.
function codigoDelTelefono(
  resuelto: ReturnType<typeof paisDelNumero>,
  numero: string,
  cc: string,
): string | null {
  if (resuelto.tipo !== 'desconocido') {
    return resuelto.codigo
  }
  return cc !== '' && numero.startsWith(cc) ? cc : null
}

function paisDeLaTabla(resuelto: ReturnType<typeof paisDelNumero>): PaisDeTelefono {
  if (resuelto.tipo === 'pais') {
    return { tipo: 'pais', nombre: resuelto.nombre }
  }
  return resuelto.tipo === 'varios'
    ? { tipo: 'varios', opciones: resuelto.opciones }
    : { tipo: 'desconocido' }
}

export function resolverTelefono(tabla: TablaDePaises, entrada: EntradaDelPais): TelefonoResuelto {
  const { numero, internacional, empresa } = entrada
  const resuelto = paisDelNumero(tabla, numero)
  const cc = soloDigitos(empresa.telefonoCc ?? '')
  const texto = (empresa.pais ?? '').trim()
  const codigo = codigoDelTelefono(resuelto, numero, cc)
  const reglaDeLaEmpresa = cc === '' ? null : paisDelNumero(tabla, cc)
  const esDeLaEmpresa =
    !internacional || (reglaDeLaEmpresa !== null && mismaRegla(resuelto, reglaDeLaEmpresa))
  if (esDeLaEmpresa && texto !== '') {
    return { codigo, pais: { tipo: 'pais', nombre: texto } }
  }
  return { codigo, pais: paisDeLaTabla(resuelto) }
}

// «Estados Unidos o Canadá», «Guadalupe, San Bartolomé o San Martín».
export function nombresDeOpciones(opciones: readonly OpcionDePais[]): string {
  const nombres = opciones.map((opcion) => opcion.nombre)
  const ultimo = nombres.pop()
  return nombres.length === 0 ? (ultimo ?? '') : `${nombres.join(', ')} o ${ultimo ?? ''}`
}

// El número partido por su código: «+54 91155550000». Sin código, tal cual: «+99912345678».
export function numeroConCodigo(numero: string, codigo: string | null): string {
  if (codigo !== null && numero.startsWith(codigo) && numero.length > codigo.length) {
    return `+${codigo} ${numero.slice(codigo.length)}`
  }
  return `+${numero}`
}

export function textoDelPais(pais: PaisDeTelefono): string {
  if (pais.tipo === 'pais') {
    return pais.nombre
  }
  return pais.tipo === 'varios' ? nombresDeOpciones(pais.opciones) : TEXTO_DE_CODIGO_DESCONOCIDO
}

// «+54 91155550000 · Argentina»: lo que sigue a «Se guardará como» y lo que acompaña a un número
// de la ficha.
export function lineaDelTelefono(numero: string, resuelto: TelefonoResuelto): string {
  return `${numeroConCodigo(numero, resuelto.codigo)} · ${textoDelPais(resuelto.pais)}`
}

// El nombre que va a «País»: sólo cuando se sabe. Un compartido o un desconocido no se adivina.
export function paisParaGuardar(resuelto: TelefonoResuelto): string | null {
  return resuelto.pais.tipo === 'pais' ? resuelto.pais.nombre : null
}

export type CambioDePais = { cambia: false } | { cambia: true; valor: string }

export type EntradaDelCambio = {
  // Lo que tiene «País» ahora.
  actual: string
  // Lo que el sistema puso: el de la empresa con el que nació el alta, el último sugerido y el
  // que se eligió con un botón.
  sugeridos: readonly string[]
  // El número ya normalizado, resuelto; `null` si todavía no es un teléfono (a medio tipear,
  // con letras, corto): no se toca nada para que «País» no parpadee.
  resuelto: TelefonoResuelto | null
}

// «País» sigue al número mientras esté vacío o tenga algo que el sistema puso. Lo que la persona
// escribió no se pisa; si lo borra, vuelve a seguir. Un compartido o un desconocido lo deja vacío:
// no es el de la empresa y no se adivina.
export function paisAlCambiarElTelefono(entrada: EntradaDelCambio): CambioDePais {
  if (entrada.resuelto === null) {
    return { cambia: false }
  }
  const actual = entrada.actual.trim()
  const sigue = actual === '' || entrada.sugeridos.includes(actual)
  if (!sigue) {
    return { cambia: false }
  }
  const nuevo = paisParaGuardar(entrada.resuelto) ?? ''
  return nuevo === actual ? { cambia: false } : { cambia: true, valor: nuevo }
}
