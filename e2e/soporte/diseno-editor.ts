// Lo que preparan y leen los e2e de la pestaña «Diseño» (4.22-2): una fórmula de tres sumandos (precio, flete y aduana suman el total) con un diseño de tres secciones,
// publicada por el camino de verdad (`_preparar_publicacion()`), y el borrador como quedó en la base. Los orígenes son los de `crearOrigenDeCotizar()`: los borra
// `borrarOrigenesDeCotizar()` con sus fórmulas.
import { literal, sql } from './sql'

const json = (valor: unknown) => `$e2e$${JSON.stringify(valor)}$e2e$::jsonb`

const definicion = {
  buckets: { origen: 'tc' },
  nodos: [
    { id: 'tc', tipo: 'tipo_cambio', etiqueta: 'Tipo de cambio', clave: 'oficial' },
    { id: 'precio', tipo: 'input', etiqueta: 'Precio', bucket: 'origen' },
    { id: 'flete', tipo: 'input', etiqueta: 'Flete', bucket: 'origen' },
    { id: 'aduana', tipo: 'input', etiqueta: 'Aduana', bucket: 'origen' },
    {
      id: 'total',
      tipo: 'calculo',
      op: 'suma',
      de: ['precio', 'flete', 'aduana'],
      etiqueta: 'Total',
      salida: 'total',
    },
  ],
}

const celda = (nodo: string) => ({ tipo: 'celda', nodo, ancho: 'completo' })

const diseno = {
  cabecera: { modos: [], ver_total_bs: false },
  secciones: [
    {
      id: 'base',
      titulo: 'Base',
      presentacion: 'principal',
      items: [celda('precio'), celda('flete')],
    },
    { id: 'extras', titulo: 'Extras', presentacion: 'principal', items: [celda('aduana')] },
    { id: 'resumen', titulo: 'Resumen', presentacion: 'principal', items: [celda('total')] },
  ],
  tarjeta_total: { nodo: 'total', secundarios: [] },
}

// Publica la versión 1 de un origen con la fórmula de tres sumandos.
export function publicarFormulaDeTresSumandos(origenId: string): void {
  sql(`
    do $f$
    declare v_def jsonb := ${json(definicion)}; v_par jsonb := '{}'::jsonb; v_dis jsonb := ${json(diseno)};
    begin
      insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, nota, publicado_en)
      values (${literal(origenId)}::uuid, 1, 'publicada', v_def, v_par, v_dis, public._preparar_publicacion(v_def, v_par, v_dis, false), 'E2E 4.22', now());
    end $f$`)
}

export type DisenoEnLaBase = {
  definicion: unknown
  params: unknown
  diseno: {
    secciones: {
      id: string
      presentacion: string
      nivel_ver?: string
      nivel_editar?: string
      items: { nodo: string; nivel_ver?: string; nivel_editar?: string }[]
    }[]
  }
}

// El borrador del origen tal como quedó, o nulo.
export function leerElBorradorDelDiseno(origenId: string): DisenoEnLaBase | null {
  const fila = sql(`
    select coalesce(row_to_json(f)::text, '')
      from (select definicion, params, diseno from public.formulas
             where origen_id = ${literal(origenId)}::uuid and estado = 'borrador') f`)
  return fila === '' ? null : (JSON.parse(fila) as DisenoEnLaBase)
}

// ¿La definición y los params del borrador son, jsonb a jsonb, los de la publicada? (el orden de las claves no cuenta.)
export function definicionYParamsComoLaPublicada(origenId: string): boolean {
  return (
    sql(`
    select (b.definicion = p.definicion and b.params = p.params)::text
      from public.formulas b join public.formulas p on p.origen_id = b.origen_id
     where b.origen_id = ${literal(origenId)}::uuid and b.estado = 'borrador' and p.estado = 'publicada'`) ===
    'true'
  )
}
