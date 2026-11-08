// Lo que preparan y leen los e2e de «Guardar el borrador» del editor de la fórmula (4.21-3b-1): el borrador como quedó en la base, y otra persona que guarda o
// empieza un borrador mientras el editor está abierto (por SQL: el trigger `trg_actualizado_en` mueve la hora, y la definición cambia de verdad, para que
// «Recargar» traiga otra cosa). Los orígenes son los de `crearOrigenDeCotizar()`: los borra `borrarOrigenesDeCotizar()` con sus fórmulas.
import { compilarFila } from '../../src/modules/cotizaciones/entities/formula/compilar-fila'
import { esquemaFormula, type Formula } from '../../src/modules/cotizaciones/entities/formula'
import { FILA_CON_TEXTO, formulaConTexto } from './formula-editor'
import { literal, sql } from './sql'

const json = (valor: unknown) => `$e2e$${JSON.stringify(valor)}$e2e$::jsonb`

export type BorradorEnLaBase = {
  id: string
  definicion: { nodos: { id: string; texto?: string }[] }
  params: Record<string, unknown>
  diseno: unknown
  nota: string | null
  version_origen_id: string | null
  actualizado_en: string
}

// El borrador del origen tal como quedó, o nulo.
export function leerBorrador(origenId: string): BorradorEnLaBase | null {
  const fila = sql(`
    select coalesce(row_to_json(f)::text, '')
      from (select id, definicion, params, diseno, nota, version_origen_id, actualizado_en
              from public.formulas where origen_id = ${literal(origenId)}::uuid and estado = 'borrador') f`)
  return fila === '' ? null : (JSON.parse(fila) as BorradorEnLaBase)
}

// El texto con que quedó guardada una fila del borrador.
export const textoGuardado = (borrador: BorradorEnLaBase, id: string): string | undefined =>
  borrador.definicion.nodos.find((n) => n.id === id)?.texto

// La id de la publicada del origen.
export function idDeLaPublicada(origenId: string): string {
  return sql(
    `select id from public.formulas where origen_id = ${literal(origenId)}::uuid and estado = 'publicada'`,
  )
}

// La fórmula con texto con la fila `comision` escrita como `texto` (por el camino de verdad, `compilarFila()`), plana como la guarda la base.
export function formulaConLaComision(texto: string) {
  const { definicion, params } = formulaConTexto()
  const leida: Formula = esquemaFormula.parse({ definicion, params })
  const r = compilarFila(leida, {
    destino: { existente: FILA_CON_TEXTO.id },
    texto,
    confirmaPisar: true,
  })
  if (!r.ok) throw new Error(`comision: ${r.error.codigo} ${r.error.mensaje}`)
  return {
    definicion: r.formula.definicion,
    params: { ...r.formula.params.constantes, tablas: r.formula.params.tablas },
  }
}

// Otra persona guarda el borrador del origen con `comision` = `texto`: cambia la definición y los params, y la hora la mueve el trigger.
export function guardarComoOtraPersona(origenId: string, texto: string): void {
  const { definicion, params } = formulaConLaComision(texto)
  sql(`
    update public.formulas set definicion = ${json(definicion)}, params = ${json(params)}
     where origen_id = ${literal(origenId)}::uuid and estado = 'borrador'`)
}

// Otra persona (`autor`, por su correo) empieza un borrador sobre la publicada del origen: su definición, sus params y su diseño.
export function crearBorradorComoOtraPersona(origenId: string, autor: string): void {
  sql(`
    insert into public.formulas (origen_id, estado, definicion, params, diseno, nota, creado_por, version_origen_id)
    select origen_id, 'borrador', definicion, params, diseno, 'Borrador de otra persona',
           (select id from public.perfiles where email = ${literal(autor)}), id
      from public.formulas where origen_id = ${literal(origenId)}::uuid and estado = 'publicada'`)
}
