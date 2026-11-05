// Lo que el e2e de la ayuda de una tabla (paso 4.13-4c2) prepara: la tabla de referencia `ch_tabla` de la fórmula de prueba con su copia viva (columnas con su etiqueta y tipo; sin
// ella el panel no tendría con qué rotular), la copia congelada en la versión (`params.tablas`, la que manda) con tres columnas —el peor caso de ancho: un texto largo— y, para el
// volumen, 1.001 filas generadas por SQL. La celda que la abre es `con_ayuda`, una constante en dólares visible a todos; la tabla sólo la lee `x_tabla`, del nivel «costos».
import { formulaDePrueba } from './cotizar-formula'
import { literal, sql } from './sql'

export const NOMBRE_DE_LA_TABLA = 'Factores de prueba'
export const TIPO_LARGO = 'camionetas_medianas'

const COLUMNAS = [
  { clave: 'anio', etiqueta: 'Año', tipo: 'anio' },
  { clave: 'tipo', etiqueta: 'Tipo de vehículo', tipo: 'texto' },
  { clave: 'factor', etiqueta: 'Factor', tipo: 'numero' },
]

// Las columnas numéricas de más que ensanchan la tabla (el peor caso de ancho: no caben ni partiendo el texto, una cifra no se parte): `Cifra 1`, `Cifra 2`…
const deMas = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    clave: `c${String(i + 1)}`,
    etiqueta: `Cifra ${String(i + 1)}`,
    tipo: 'numero',
  }))

// Tres filas: el año, el texto largo y un factor que crece de a medio punto desde `base`, y `anchas` cifras de más.
export const filasDePrueba = (base: number, anchas = 0) =>
  [2018, 2019, 2020].map((anio, i) => ({
    anio,
    tipo: TIPO_LARGO,
    factor: base + i * 0.5,
    ...Object.fromEntries(deMas(anchas).map((c, j) => [c.clave, 1234.5 + i + j])),
  }))

const json = (valor: unknown) => `$e2e$${JSON.stringify(valor)}$e2e$::jsonb`

// Las filas congeladas en SQL: una lista de JSON o `n` generadas (`generate_series`).
export type FilasDeLaTabla = { lista: unknown[] } | { generadas: number }
const filasEnSql = (filas: FilasDeLaTabla) =>
  'lista' in filas
    ? json(filas.lista)
    : `(select coalesce(jsonb_agg(jsonb_build_object('anio', 1980 + (g % 40), 'tipo', '${TIPO_LARGO}', 'factor', g * 1.5) order by g), '[]'::jsonb) from generate_series(1, ${String(filas.generadas)}) g)`

// Publica en el origen la fórmula de prueba (versión 1) con `ch_tabla` congelada con esas filas, y le da su copia viva.
export function publicarConTabla(origenId: string, filas: FilasDeLaTabla, anchas = 0): void {
  const { definicion, params, diseno } = formulaDePrueba()
  sql(`
    do $f$
    declare v_def jsonb := ${json(definicion)}; v_par jsonb := ${json(params)}; v_dis jsonb := ${json(diseno)};
    begin
      v_par := jsonb_set(v_par, '{tablas,ch_tabla}', ${filasEnSql(filas)});
      delete from public.formulas where origen_id = ${literal(origenId)}::uuid;
      insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, nota, publicado_en)
      values (${literal(origenId)}::uuid, 1, 'publicada', v_def, v_par, v_dis, public._preparar_publicacion(v_def, v_par, v_dis, false), 'E2E 4.13-4c2', now());
      delete from public.tablas_referencia where origen_id = ${literal(origenId)}::uuid and clave = 'ch_tabla';
      insert into public.tablas_referencia (origen_id, clave, nombre, columnas)
      values (${literal(origenId)}::uuid, 'ch_tabla', ${literal(NOMBRE_DE_LA_TABLA)}, ${json([...COLUMNAS, ...deMas(anchas)])});
    end $f$`)
}

// Publica la versión siguiente con otras filas congeladas (lo que haría quien configura): la anterior queda archivada. Para probar que el panel de una hoja que se abrió antes
// muestra las filas de SU versión (4-28) y no las de la publicada ahora.
export function publicarLaVersionSiguienteConTabla(origenId: string, filas: unknown[]): void {
  sql(`
    do $f$
    declare v1 public.formulas;
    begin
      select * into v1 from public.formulas where origen_id = ${literal(origenId)}::uuid and estado = 'publicada';
      update public.formulas set estado = 'archivada' where id = v1.id;
      insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, nota, publicado_en)
      values (v1.origen_id, v1.version + 1, 'publicada', v1.definicion, jsonb_set(v1.params, '{tablas,ch_tabla}', ${json(filas)}), v1.diseno, v1.visibilidad, 'E2E 4.13-4c2 siguiente', now());
    end $f$`)
}
