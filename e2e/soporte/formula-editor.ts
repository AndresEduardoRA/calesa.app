// Lo que preparan los e2e del editor de la fórmula (4.21-3a-1): la fórmula de prueba (`cotizar-formula.ts`) con una fila escrita en texto, `comision` = `=pub*4%`,
// compilada por el camino de verdad (`compilarFila()` de `src/`, que guarda `{ ...raíz compilada, texto }`) y publicada con `_preparar_publicacion()`; el ⚙ simulado
// sobre su auxiliar (como `formula_cambiar_constante()`: publica N+1 con `params || {nodo: valor}` sin mirar el texto); y un borrador de muchas filas para el tope.
// Los orígenes son los de `crearOrigenDeCotizar()`: los borra `borrarOrigenesDeCotizar()` con sus fórmulas.
import { compilarFila } from '../../src/modules/cotizaciones/entities/formula/compilar-fila'
import { esquemaFormula, type Formula } from '../../src/modules/cotizaciones/entities/formula'
import { validarFormula } from '../../src/modules/cotizaciones/entities/validar'
import { formulaDePrueba } from './cotizar-formula'
import { literal, sql } from './sql'

export const FILA_CON_TEXTO = { id: 'comision', etiqueta: 'Comisión', texto: '=pub*4%' } as const
// La constante que el compilador creó para el `4%` (la auxiliar 1 de la fila).
export const AUXILIAR_DEL_PORCENTAJE = 'comision__1'

const json = (valor: unknown) => `$e2e$${JSON.stringify(valor)}$e2e$::jsonb`

// Lo guardado es plano (`{con_ayuda: 5, comision__1: 0.04, tablas}`), como el seed.
const plano = (formula: Formula) => ({
  ...formula.params.constantes,
  tablas: formula.params.tablas,
})

// La fórmula de prueba con la fila `comision` tras `x_sub`. Lanza si no compila o no valida: es un error de la prueba.
export function formulaConTexto() {
  const { definicion, params, diseno } = formulaDePrueba()
  const leida = esquemaFormula.parse({ definicion, params })
  const r = compilarFila(leida, {
    destino: { id: FILA_CON_TEXTO.id, etiqueta: FILA_CON_TEXTO.etiqueta, despuesDe: 'x_sub' },
    texto: FILA_CON_TEXTO.texto,
  })
  if (!r.ok) throw new Error(`comision: ${r.error.codigo} ${r.error.mensaje}`)
  const v = validarFormula(r.formula.definicion, plano(r.formula))
  if (!v.ok) throw new Error(`la fórmula con texto no valida: ${v.error.mensaje}`)
  // Todo nodo va en una sección del diseño (`nodo_sin_seccion`): la fila y su auxiliar, en una propia.
  const seccion = {
    id: 'comision',
    titulo: 'Comisión',
    presentacion: 'principal',
    items: [
      { tipo: 'celda', nodo: AUXILIAR_DEL_PORCENTAJE, ancho: 'mitad' },
      { tipo: 'celda', nodo: FILA_CON_TEXTO.id, ancho: 'mitad' },
    ],
  }
  return {
    definicion: r.formula.definicion,
    params: plano(r.formula),
    diseno: { ...diseno, secciones: [...diseno.secciones, seccion] },
  }
}

// Publica la versión 1 de un origen con la fórmula con texto.
export function publicarFormulaConTexto(origenId: string): void {
  const { definicion, params, diseno } = formulaConTexto()
  sql(`
    do $f$
    declare v_def jsonb := ${json(definicion)}; v_par jsonb := ${json(params)}; v_dis jsonb := ${json(diseno)};
    begin
      insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, nota, publicado_en)
      values (${literal(origenId)}::uuid, 1, 'publicada', v_def, v_par, v_dis, public._preparar_publicacion(v_def, v_par, v_dis, false), 'E2E 4.21', now());
    end $f$`)
}

// El ⚙ simulado: la publicada pasa a archivada y la N+1 lleva `params || {nodo: valor}`, con la definición (y su texto) de antes.
export function ajustarConstante(origenId: string, nodo: string, valor: number): void {
  sql(`
    do $f$
    declare v1 public.formulas;
    begin
      select * into v1 from public.formulas where origen_id = ${literal(origenId)}::uuid and estado = 'publicada';
      update public.formulas set estado = 'archivada' where id = v1.id;
      insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, nota, publicado_en)
      values (v1.origen_id, v1.version + 1, 'publicada', v1.definicion, v1.params || jsonb_build_object(${literal(nodo)}, ${String(valor)}::numeric), v1.diseno, v1.visibilidad, 'E2E 4.21 ⚙', now());
    end $f$`)
}

// Una definición de `n` filas con texto (`fila_1` … `fila_n`, cada una `=remate+fees`; la última da el total, con su bucket), sin diseño: sólo vive en un borrador.
export function definicionDeNFilas(n: number) {
  const filas = Array.from({ length: n }, (_, i) => ({
    id: `fila_${String(i + 1)}`,
    tipo: 'calculo',
    op: 'suma',
    de: ['remate', 'fees'],
    etiqueta: `Fila ${String(i + 1)}`,
    texto: '=remate+fees',
    ...(i === n - 1 ? { salida: 'total', bucket: 'b' } : {}),
  }))
  return {
    nodos: [
      { id: 'tc', tipo: 'tipo_cambio', etiqueta: 'TC', clave: 'oficial', formato: 'raw' },
      { id: 'remate', tipo: 'input', etiqueta: 'Remate', formato: 'usd' },
      { id: 'fees', tipo: 'input', etiqueta: 'Fees', formato: 'usd' },
      ...filas,
    ],
    buckets: { b: 'tc' },
  }
}

// Un borrador de `autor` con `n` filas, en un origen sin publicada (el primero del origen).
export function sembrarBorradorDeNFilas(origenId: string, n: number, autor: string): void {
  sql(`
    insert into public.formulas (origen_id, estado, definicion, params, nota, creado_por)
    values (${literal(origenId)}::uuid, 'borrador', ${json(definicionDeNFilas(n))}, '{}'::jsonb, 'Borrador E2E grande',
            (select id from public.perfiles where email = ${literal(autor)}))`)
}
