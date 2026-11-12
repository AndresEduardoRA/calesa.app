-- El cuerpo de una guía sale de su documento (8.01-1, C6–C8): `web_guias.cuerpo_doc` es lo que escribe el editor y `cuerpo_html` y
-- `minutos_lectura` los deriva la base con `_web_doc_html()` y `_web_doc_minutos()`. Lo que llegue en `cuerpo_html` se pisa, escriba
-- quien escriba: `web.guias` (a la vista de `anon`) sólo sirve HTML de la lista blanca.
--
-- D8: una guía de antes, sin documento, conserva su HTML mientras nadie escriba el cuerpo; pero una guía publicada siempre lleva el HTML
-- derivado: publicar recalcula, y las publicadas sin documento se despublican aquí (no se borra contenido: se oculta lo no saneado).

alter table public.web_guias add column cuerpo_doc jsonb;
alter table public.web_guias add constraint web_guias_cuerpo_doc_objeto
  check (cuerpo_doc is null or jsonb_typeof(cuerpo_doc) = 'object');
comment on column public.web_guias.cuerpo_doc is
  'El documento del editor (JSON de ProseMirror, lista blanca de _web_doc_html). cuerpo_html y minutos_lectura los deriva trg_web_guia_cuerpo. 8.01-1.';

-- Las publicadas sin documento y con HTML escrito antes: fuera de la vista. Publicar o despublicar exige web.guias.publicar
-- (trg_web_guia_publicar_validar), que la migración no tiene: se apaga sólo para esta sentencia.
do $$
declare v_n int;
begin
  alter table public.web_guias disable trigger trg_web_guia_publicar_validar;
  update public.web_guias set publicada_en = null
   where cuerpo_doc is null and cuerpo_html <> '' and publicada_en is not null;
  get diagnostics v_n = row_count;
  alter table public.web_guias enable trigger trg_web_guia_publicar_validar;
  if v_n > 0 then
    raise notice 'web_guias: % guías publicadas con HTML sin documento quedaron despublicadas (se publican de nuevo al guardar su documento).', v_n;
  end if;
end $$;

-- En INSERT, o si cambió el documento, el HTML, los minutos, o la guía se publica: recalcula desde el documento. Si no, no toca (D8).
create or replace function public.web_guia_cuerpo() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT'
     or new.cuerpo_doc is distinct from old.cuerpo_doc
     or new.cuerpo_html is distinct from old.cuerpo_html
     or new.minutos_lectura is distinct from old.minutos_lectura
     or (old.publicada_en is null and new.publicada_en is not null) then
    new.cuerpo_html := public._web_doc_html(new.cuerpo_doc);
    new.minutos_lectura := public._web_doc_minutos(new.cuerpo_doc);
  end if;
  return new;
end;
$$;

revoke all on function public.web_guia_cuerpo() from public, anon, authenticated;
grant execute on function public.web_guia_cuerpo() to service_role;

create trigger trg_web_guia_cuerpo before insert or update on public.web_guias
  for each row execute function public.web_guia_cuerpo();

-- C8: las imágenes del cuerpo cuentan para el refcount del bucket `web` (sólo pueden ir en el primer nivel del documento). Recorre las guías
-- con documento (decenas) con jsonb_path_exists. Lo demás, idéntico a la definición de 6.05 (20261112032907_documentos_revisar.sql).
create or replace function public.storage_refcount(p_bucket text, p_ruta text) returns integer
language sql stable security definer
set search_path = ''
as $$
  select (
    (select count(*) from public.vehiculos_imagenes where p_bucket = 'vehiculos' and ruta = p_ruta) +
    (select count(*) from public.vehiculos_imagenes where p_bucket = 'vehiculos' and ruta_miniatura = p_ruta) +
    (select count(*) from public.repuestos_items_imagenes where p_bucket = 'repuestos' and ruta = p_ruta) +
    (select count(*) from public.documentos where p_bucket = 'documentos' and ruta = p_ruta and eliminado_en is null) +
    (select count(*) from public.cotizaciones_adjuntos where p_bucket = 'cotizaciones' and ruta = p_ruta) +
    (select count(*) from public.gastos where p_bucket = 'comprobantes' and comprobante_ruta = p_ruta) +
    (select count(*) from public.pagos where p_bucket = 'comprobantes' and comprobante_ruta = p_ruta) +
    (select count(*) from public.repuestos_compras where p_bucket = 'comprobantes' and comprobante_ruta = p_ruta) +
    (select count(*) from public.perfiles where p_bucket = 'avatares' and avatar_ruta = p_ruta) +
    (select count(*) from public.perfiles where p_bucket = 'avatares' and avatar_miniatura_ruta = p_ruta) +
    (select count(*) from public.web_guias where p_bucket = 'web' and portada_ruta = p_ruta) +
    (select count(*) from public.web_guias where p_bucket = 'web' and cuerpo_doc is not null
       and jsonb_path_exists(cuerpo_doc, 'lax $.content[*] ? (@.type == "image").attrs.ruta ? (@ == $r)', jsonb_build_object('r', p_ruta))) +
    (select count(*) from public.web_testimonios where p_bucket = 'web' and foto_ruta = p_ruta) +
    (select count(*) from public.ajustes_empresa where p_bucket = 'marca' and (logo_ruta = p_ruta or logo_oscuro_ruta = p_ruta)) +
    (select count(*) from public.ajustes_empresa e, jsonb_each_text(coalesce(e.iconos, '{}'::jsonb)) i where p_bucket = 'marca' and i.value = p_ruta)
  )::int;
$$;
