// Editar la cabecera del diseño (4.22-3): «Ver total en moneda local» y los modos de tipo de cambio. Un modo es otro `buckets` y otro `total_en`; `sumarModo()` lo
// crea copiando los de la fórmula, así valida de entrada. Nada muta lo que recibe; lo que `validarDiseno()` rechaza tras un cambio queda aplicado y lo dice el editor.
import type { Diseno, ModoDeTipoDeCambio } from '../diseno'
import type { Definicion } from '../formula'

export const MAXIMO_DEL_NOMBRE_DE_MODO = 40
// Lo que admite el id de una clave (`^[a-z][a-z0-9_]{0,40}$`).
const MAXIMO_DE_LA_CLAVE = 41

export type TipoDeCambioDelDiseno = { id: string; etiqueta: string }

export const ponerVerTotalBs = (diseno: Diseno, valor: boolean): Diseno => ({
  ...diseno,
  cabecera: { ...diseno.cabecera, ver_total_bs: valor },
})

// Los nodos `tipo_cambio` de la fórmula, en su orden: lo que un modo puede elegir.
export function tiposDeCambio(definicion: Definicion): TipoDeCambioDelDiseno[] {
  return definicion.nodos
    .filter((n) => n.tipo === 'tipo_cambio')
    .map((n) => ({ id: n.id, etiqueta: n.etiqueta }))
}

const limpiarNombre = (nombre: string) =>
  Array.from(nombre.trim()).slice(0, MAXIMO_DEL_NOMBRE_DE_MODO).join('')

// De un nombre, una clave: minúsculas sin tildes, lo que no es letra o dígito a `_`, empieza por letra (si no, `modo_`), hasta 41 caracteres; sin repetir las usadas.
export function claveDeModo(nombre: string, usadas: readonly string[]): string {
  const sinTildes = nombre
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
  const conLetra = /^[a-z]/.test(sinTildes) ? sinTildes : `modo_${sinTildes}`
  const cortada = conLetra.slice(0, MAXIMO_DE_LA_CLAVE)
  const ocupadas = new Set(usadas)
  if (!ocupadas.has(cortada)) return cortada
  for (let n = 2; ; n += 1) {
    const sufijo = `_${String(n)}`
    const candidata = `${cortada.slice(0, MAXIMO_DE_LA_CLAVE - sufijo.length)}${sufijo}`
    if (!ocupadas.has(candidata)) return candidata
  }
}

// Un modo nuevo copia el mapa de la fórmula (cada bucket con su tipo de cambio y su `total_en`). Sin `total_en`, sin buckets o con un nombre vacío no suma nada.
export function sumarModo(definicion: Definicion, diseno: Diseno, nombre: string): Diseno {
  const limpio = limpiarNombre(nombre)
  const buckets = Object.entries(definicion.buckets ?? {})
  if (limpio === '' || definicion.total_en === undefined || buckets.length === 0) return diseno
  const modo: ModoDeTipoDeCambio = {
    clave: claveDeModo(
      limpio,
      diseno.cabecera.modos.map((m) => m.clave),
    ),
    nombre: limpio,
    buckets: buckets.map(([bucket, nodo]) => ({ bucket, nodo })),
    total_en: definicion.total_en,
  }
  return { ...diseno, cabecera: { ...diseno.cabecera, modos: [...diseno.cabecera.modos, modo] } }
}

export type CambioDeModo = {
  nombre?: string
  // Sustituye la entrada de ese bucket y mantiene el orden.
  bucket?: { bucket: string; nodo: string }
  total_en?: string
}

// El nombre vacío o de blancos deja el que había (la base pide de 1 a 40 caracteres).
export function ponerModo(diseno: Diseno, clave: string, cambios: CambioDeModo): Diseno {
  const nombre = cambios.nombre === undefined ? undefined : limpiarNombre(cambios.nombre)
  const cambiar = (m: ModoDeTipoDeCambio): ModoDeTipoDeCambio => {
    const { bucket } = cambios
    return {
      ...m,
      ...(nombre === undefined || nombre === '' ? {} : { nombre }),
      ...(cambios.total_en === undefined ? {} : { total_en: cambios.total_en }),
      ...(bucket === undefined
        ? {}
        : {
            buckets: m.buckets.map((e) =>
              e.bucket === bucket.bucket ? { ...e, nodo: bucket.nodo } : e,
            ),
          }),
    }
  }
  return {
    ...diseno,
    cabecera: {
      ...diseno.cabecera,
      modos: diseno.cabecera.modos.map((m) => (m.clave === clave ? cambiar(m) : m)),
    },
  }
}

export const quitarModo = (diseno: Diseno, clave: string): Diseno => ({
  ...diseno,
  cabecera: { ...diseno.cabecera, modos: diseno.cabecera.modos.filter((m) => m.clave !== clave) },
})
