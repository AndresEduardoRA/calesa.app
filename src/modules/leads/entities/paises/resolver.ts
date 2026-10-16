// De qué país es un número: el prefijo más largo de la tabla gana. Sin I/O y sin la tabla adentro: la
// recibe, porque pesa y se carga aparte (`tabla.ts`, con `import()`).
//
// El número llega ya normalizado (sólo dígitos, con su código de país, de 8 a 15): lo que entrega
// `normalizarTelefono()`.

export type TablaDePaises = {
  // ISO 3166-1 alfa-2 → nombre en español.
  nombres: Readonly<Record<string, string>>
  // Dígitos que siguen al «+» → ISO.
  prefijos: Readonly<Record<string, string>>
  // Prefijos que no deciden un país: se le piden a la persona.
  compartidos: Readonly<Record<string, readonly string[]>>
}

export type OpcionDePais = { iso: string; nombre: string }

export type PaisDelNumero =
  // `codigo` es el código de llamada del país («1», «54», «591»): lo que el «+» deja partir.
  | { tipo: 'pais'; iso: string; nombre: string; codigo: string }
  | { tipo: 'varios'; codigo: string; opciones: readonly OpcionDePais[] }
  | { tipo: 'desconocido' }

// El prefijo más largo de la tabla (de «3906698», «2125288», «6189162»).
const LARGO_MAXIMO_DE_PREFIJO = 7

// El código de llamada empieza con 1 o 7 (un dígito), con dos dígitos que son un código de la
// tabla («54», «34»), o es de tres. «76» y «77» son de Kazajistán, dentro del +7.
function largoDelCodigo(tabla: TablaDePaises, numero: string): number {
  if (numero.startsWith('1') || numero.startsWith('7')) {
    return 1
  }
  const dos = numero.slice(0, 2)
  return dos in tabla.prefijos ? 2 : 3
}

export function paisDelNumero(tabla: TablaDePaises, numero: string): PaisDelNumero {
  const tope = Math.min(LARGO_MAXIMO_DE_PREFIJO, numero.length)
  const codigo = numero.slice(0, largoDelCodigo(tabla, numero))
  for (let largo = tope; largo >= 1; largo -= 1) {
    const prefijo = numero.slice(0, largo)
    const iso = tabla.prefijos[prefijo]
    if (iso !== undefined) {
      return { tipo: 'pais', iso, nombre: tabla.nombres[iso] ?? iso, codigo }
    }
    const varios = tabla.compartidos[prefijo]
    if (varios) {
      const opciones = varios.map((isoDeOpcion) => ({
        iso: isoDeOpcion,
        nombre: tabla.nombres[isoDeOpcion] ?? isoDeOpcion,
      }))
      return { tipo: 'varios', codigo, opciones }
    }
  }
  return { tipo: 'desconocido' }
}
