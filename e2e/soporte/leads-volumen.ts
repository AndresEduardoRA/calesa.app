// El lead con volumen de la 9d-2: 20.000 seguimientos y 5.000 recordatorios (2.000 pendientes, la mitad
// vencidos, y 3.000 completados) de una persona, sembrados por SQL. La base es la de toda la suite: el
// lead nace en el año 2000 (no sale en la primera página del listado de nadie) y se borra al terminar
// y, por su marca, antes de empezar si quedó de una corrida rota.
import { literal, sql } from './sql'

export const MARCA_DE_VOLUMEN = 'Volumen 9d-2'
export const SEGUIMIENTOS = 20_000
export const PENDIENTES = 2_000
export const COMPLETADOS = 3_000

// Borra los leads con la marca y todo lo suyo. Los hijos van sin triggers (cada borrado de un
// seguimiento recalcularía el lead); el lead, con los suyos.
export function borrarVolumen(): void {
  sql(`
    begin;
    create temporary table volumen on commit drop as
      select id from public.leads where nombre like ${literal(`%${MARCA_DE_VOLUMEN}%`)};
    set local session_replication_role = replica;
    delete from public.seguimientos where lead_id in (select id from volumen);
    delete from public.recordatorios where lead_id in (select id from volumen);
    set local session_replication_role = origin;
    delete from public.leads where id in (select id from volumen);
    commit;
  `)
}

// Siembra sobre un lead ya creado (de `personaId`, que es su dueña): seguimientos suyos cada 30
// minutos hacia atrás, privados; pendientes cada hora (los primeros, vencidos); completados.
export function sembrarVolumen(leadId: string, personaId: string): void {
  const lead = literal(leadId)
  const persona = literal(personaId)
  sql(`
    begin;
    update public.leads set creado_en = '2000-01-01T12:00:00Z' where id = ${lead};
    set local session_replication_role = replica;
    insert into public.seguimientos (lead_id, usuario_id, tipo_id, titulo, detalle_doc, detalle_texto, ocurrido_en)
    select ${lead}, ${persona},
           (select id from public.tipos_seguimiento where activo order by orden limit 1),
           'Volumen ' || g,
           jsonb_build_object('type', 'doc', 'content', jsonb_build_array(jsonb_build_object('type', 'paragraph',
             'content', jsonb_build_array(jsonb_build_object('type', 'text',
               'text', 'Habló del vehículo y quedó en volver a llamar la semana que viene, nota ' || g))))),
           'Habló del vehículo y quedó en volver a llamar la semana que viene, nota ' || g,
           now() - make_interval(mins => g * 30)
      from generate_series(1, ${String(SEGUIMIENTOS)}) g;
    insert into public.recordatorios (usuario_id, lead_id, titulo, recordar_en, completado_en)
    select ${persona}, ${lead}, 'Recordar ' || g,
           case when g <= ${String(PENDIENTES / 2)} then now() - make_interval(hours => ${String(PENDIENTES / 2 + 1)} - g)
                else now() + make_interval(hours => g) end,
           case when g > ${String(PENDIENTES)} then now() - make_interval(mins => g) end
      from generate_series(1, ${String(PENDIENTES + COMPLETADOS)}) g;
    set local session_replication_role = origin;
    update public.leads set ultimo_seguimiento_en = now() - interval '30 minutes' where id = ${lead};
    commit;
    analyze public.seguimientos;
    analyze public.recordatorios;
  `)
}

// El título del más reciente que «Ir a una fecha» tiene que mostrar primero para `dia`: el último de ese
// día o de antes, en la zona de la empresa.
export function primeroHasta(leadId: string, dia: string): string {
  return sql(`
    select s.titulo from public.seguimientos s
     where s.lead_id = ${literal(leadId)} and s.eliminado_en is null
       and s.ocurrido_en < ((${literal(dia)}::date + 1)::timestamp at time zone
                            (select zona_horaria from public.ajustes_empresa limit 1))
     order by s.ocurrido_en desc, s.id desc limit 1;
  `)
}

// Otra ventana cambió este seguimiento: su versión se mueve (el que lo está editando choca).
export function cambiarEnOtraVentana(titulo: string, leadId: string): void {
  sql(`
    update public.seguimientos set detalle_texto = detalle_texto || ' (otra ventana)',
           actualizado_en = clock_timestamp()
     where lead_id = ${literal(leadId)} and titulo = ${literal(titulo)};
  `)
}
