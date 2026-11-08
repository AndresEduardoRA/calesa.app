// Editar el diseño de un origen desde Configuración › Cotización › Diseño (4.22-2): la versión que se abre, las operaciones puras sobre una sección y una celda,
// el pedido de guardar el borrador y si hay algo por guardar. Nada muta lo que recibe. El diseño que sale de aquí lo vuelve a revisar `validarDiseno()` en cada cambio
// y la base al publicar; guardar un borrador no exige que valide (como la fórmula, 4.21-3b-1).
import type { Resultado } from '@/shared/lib/errores'
import { type Diseno, type SeccionDeDiseno, ANCHOS, PRESENTACIONES } from '../diseno'
import type { Definicion } from '../formula'
import type { ContextoDeDiseno } from '../validar-diseno'

// Un nivel como lo lee el editor de `cotizaciones_niveles`.
export type NivelDelDiseno = { clave: string; nombre: string; retirado: boolean }

// La versión que se edita: el borrador o, sin borrador, la publicada. `actualizadoEn` es el texto de la base (con sus microsegundos): nunca pasa por `Date`.
// `params` va tal cual lo guarda la base: este editor no los toca.
export type DisenoParaEditar = {
  id: string
  estado: 'borrador' | 'publicada'
  actualizadoEn: string
  nota: string | null
  definicion: Definicion
  params: Record<string, unknown>
  diseno: Diseno | null
}

export type EsperadaDeGuardarDiseno =
  { sobre: 'publicada'; publicadaId: string } | { sobre: 'borrador'; actualizadoEn: string }

// Lo que se manda a `formula_guardar_borrador()`: la definición y los `params` salen como se leyeron.
export type PedidoDeGuardarDiseno = {
  origenId: string
  definicion: Definicion
  params: Record<string, unknown>
  diseno: Diseno
  nota: string | null
  esperada: EsperadaDeGuardarDiseno
}

// La fila escrita: su id y la hora que le puso la base, para volver a guardar sin releer.
export type BorradorDelDisenoGuardado = { id: string; actualizadoEn: string }

// Lo que escribe el editor del diseño: guarda el borrador por `formula_guardar_borrador()` (sobre la publicada lo crea, sobre el borrador lo pisa con su hora).
export interface RepositorioDelDiseno {
  guardarBorrador(pedido: PedidoDeGuardarDiseno): Promise<Resultado<BorradorDelDisenoGuardado>>
}

export const MOTIVO_SIN_PERMISO_DEL_DISENO =
  'No tienes permiso para configurar el diseño de este origen.'

export const MAXIMO_DEL_TITULO = 80

// Sobre qué guarda el editor: la versión leída y, tras guardar, la fila que devolvió la base.
export type BaseDelDiseno = Pick<DisenoParaEditar, 'id' | 'estado' | 'actualizadoEn' | 'nota'>

// Sobre la publicada crea el borrador (su id como esperada, la nota nula: la de la publicada es de su publicación); sobre el borrador lo pisa con su hora y su nota.
export function pedidoDeGuardarDiseno(
  base: BaseDelDiseno,
  leida: Pick<DisenoParaEditar, 'definicion' | 'params'>,
  diseno: Diseno,
  origenId: string,
): PedidoDeGuardarDiseno {
  const comun = { origenId, definicion: leida.definicion, params: leida.params, diseno }
  return base.estado === 'publicada'
    ? { ...comun, nota: null, esperada: { sobre: 'publicada', publicadaId: base.id } }
    : {
        ...comun,
        nota: base.nota,
        esperada: { sobre: 'borrador', actualizadoEn: base.actualizadoEn },
      }
}

export const conSeccion = (
  diseno: Diseno,
  seccionId: string,
  cambiar: (s: SeccionDeDiseno) => SeccionDeDiseno,
): Diseno => ({
  ...diseno,
  secciones: diseno.secciones.map((s) => (s.id === seccionId ? cambiar(s) : s)),
})

// El título vacío o de blancos quita la clave (la base pide de 1 a 80 caracteres); más largo se corta.
export function ponerSeccion(
  diseno: Diseno,
  seccionId: string,
  cambios: { titulo?: string; presentacion?: SeccionDeDiseno['presentacion'] },
): Diseno {
  return conSeccion(diseno, seccionId, (s) => {
    let siguiente = s
    if (cambios.titulo !== undefined) {
      const { titulo: _anterior, ...resto } = siguiente
      const limpio = Array.from(cambios.titulo.trim()).slice(0, MAXIMO_DEL_TITULO).join('')
      siguiente = limpio === '' ? resto : { ...resto, titulo: limpio }
    }
    if (cambios.presentacion !== undefined && PRESENTACIONES.includes(cambios.presentacion)) {
      siguiente = { ...siguiente, presentacion: cambios.presentacion }
    }
    return siguiente
  })
}

export function ponerAncho(
  diseno: Diseno,
  seccionId: string,
  nodoId: string,
  ancho: (typeof ANCHOS)[number],
): Diseno {
  if (!ANCHOS.includes(ancho)) return diseno
  return conSeccion(diseno, seccionId, (s) => {
    let hecha = false
    return {
      ...s,
      items: s.items.map((it) => {
        if (hecha || it.tipo !== 'celda' || it.nodo !== nodoId) return it
        hecha = true
        return { ...it, ancho }
      }),
    }
  })
}

// Lo que `validarDiseno()` necesita saber del mundo: los niveles (también los retirados) y los retirados. El catálogo de tonos es del 4.22-4: se pasan los de los
// grupos de la propia definición, así `tono_inexistente` no se dispara aquí (la dice la base al publicar).
export function contextoDelEditor(
  definicion: Definicion,
  niveles: readonly NivelDelDiseno[],
): ContextoDeDiseno {
  return {
    niveles: niveles.map((n) => n.clave),
    retirados: niveles.filter((n) => n.retirado).map((n) => n.clave),
    tonos: (definicion.grupos ?? []).map((g) => g.tono),
  }
}

// Iguales en profundidad: el orden de las claves no cuenta, el de una lista sí, y una clave indefinida es una ausente.
function iguales(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((x, i) => iguales(x, b[i]))
  }
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  const ra = a as Record<string, unknown>
  const rb = b as Record<string, unknown>
  const clavesA = Object.keys(ra).filter((k) => ra[k] !== undefined)
  const clavesB = Object.keys(rb).filter((k) => rb[k] !== undefined)
  return clavesA.length === clavesB.length && clavesA.every((k) => iguales(ra[k], rb[k]))
}

// O(nodos), una vez por cambio aplicado.
export const hayCambiosEnElDiseno = (guardado: Diseno, trabajo: Diseno) =>
  guardado !== trabajo && !iguales(guardado, trabajo)
