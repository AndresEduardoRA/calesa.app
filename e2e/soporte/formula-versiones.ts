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
