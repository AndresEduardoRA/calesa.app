import { formulaDePrueba } from './cotizar-formula'
import { literal, sql } from './sql'

// Las versiones de la fórmula de un origen de prueba (4.20-2a), sembradas por SQL (`generate_series`): la publicada de prueba (`publicarFormulaDePrueba`) pasa a ser la
// N+1 y debajo quedan las archivadas 1…N con su mismo diseño y visibilidad (el `check` lo exige), publicadas por `autor`. Con `borradorAtrasado`, un borrador de `autor`
// que empezó sobre la N (ya no la publicada). Las borra `borrarOrigenesDeCotizar()` con el origen (`formulas_origen_id_fkey`, `on delete cascade`).
export function sembrarVersiones(
  origenId: string,
  cuantas: number,
  opciones: { autor: string; borradorAtrasado?: boolean },
): void {
  const origen = `${literal(origenId)}::uuid`
  const autor = `(select id from public.perfiles where email = ${literal(opciones.autor)})`
  sql(`
    do $f$
    declare v public.formulas;
    begin
      select * into v from public.formulas where origen_id = ${origen} and estado = 'publicada';
      update public.formulas set version = ${cuantas + 1}, nota = 'Publicada E2E', publicado_por = ${autor}, publicado_en = now() where id = v.id;
      insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, nota, publicado_por, publicado_en)
      select v.origen_id, n, 'archivada', v.definicion, v.params, v.diseno, v.visibilidad, 'Nota E2E ' || n, ${autor}, now() - make_interval(mins => ${cuantas + 1} - n)
        from generate_series(1, ${cuantas}) n;
      if ${opciones.borradorAtrasado ? 'true' : 'false'} then
        insert into public.formulas (origen_id, estado, definicion, params, nota, creado_por, version_origen_id)
        select v.origen_id, 'borrador', v.definicion, v.params, 'Borrador E2E', ${autor}, id
          from public.formulas where origen_id = v.origen_id and version = ${cuantas};
      end if;
    end $f$`)
}

// Un borrador de `autor` en un origen de prueba (4.20-2b), con la fórmula de prueba (`formulaDePrueba()`): `sobre: 'publicada'` empezó sobre la publicada de hoy (al
// día), `'ninguna'` no dice sobre cuál (el primero de un origen). Sin diseño (`conDiseno: false`), publicarlo da «Publicar pide el diseño de la hoja.».
export function sembrarBorrador(
  origenId: string,
  opciones: { autor: string; sobre: 'publicada' | 'ninguna'; conDiseno: boolean; nota?: string },
): void {
  const { definicion, params, diseno } = formulaDePrueba()
  const json = (valor: unknown) => `$e2e$${JSON.stringify(valor)}$e2e$::jsonb`
  const origen = `${literal(origenId)}::uuid`
  const sobre =
    opciones.sobre === 'publicada'
      ? `(select id from public.formulas where origen_id = ${origen} and estado = 'publicada')`
      : 'null'
  sql(`
    insert into public.formulas (origen_id, estado, definicion, params, diseno, nota, creado_por, version_origen_id)
    values (${origen}, 'borrador', ${json(definicion)}, ${json(params)}, ${opciones.conDiseno ? json(diseno) : 'null'},
            ${literal(opciones.nota ?? 'Borrador E2E')}, (select id from public.perfiles where email = ${literal(opciones.autor)}), ${sobre})`)
}
