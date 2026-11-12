-- El consentimiento de un testimonio se registra y se retira por RPC (8.01-1, C13–C16): `consent_*` deja de escribirse directo, un
-- testimonio no se publica sin el trío (quién, cuándo, por qué canal) y sin retirar, y cambiar lo que dice o su foto anula el
-- consentimiento (D15): la persona consintió ese texto y esa foto.

-- D12: los publicados sin el trío (o retirados) ya no se veían en `web.testimonios`; se despublican para que el trigger no rompa sus
-- próximas escrituras.
update public.web_testimonios set publicado = false
 where publicado and (consent_por is null or consent_en is null or consent_canal is null or consent_retirado_en is not null);

-- C15 y D15 · el trío y el consentimiento atado al texto.
create or replace function public.web_testimonio_exigir_consentimiento() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.consent_por is not null
     and (new.cliente is distinct from old.cliente or new.texto is distinct from old.texto or new.foto_ruta is distinct from old.foto_ruta) then
    new.consent_por := null;
    new.consent_en := null;
    new.consent_canal := null;
    new.consent_ciudad := false;
    new.consent_vehiculo := false;
    new.consent_foto := false;
    new.consent_retirado_en := null;
    new.publicado := false;
  end if;
  if new.publicado
     and (new.consent_por is null or new.consent_en is null or new.consent_canal is null or new.consent_retirado_en is not null) then
    raise exception 'Falta registrar el consentimiento.' using errcode = '22023', hint = 'publicado';
  end if;
  return new;
end;
$$;

revoke all on function public.web_testimonio_exigir_consentimiento() from public, anon, authenticated;
grant execute on function public.web_testimonio_exigir_consentimiento() to service_role;

create trigger trg_web_testimonio_consentimiento before insert or update on public.web_testimonios
  for each row execute function public.web_testimonio_exigir_consentimiento();

-- C16 · consent_* sólo por las RPC. El revoke de tabla quita los grants de columna: va primero.
revoke insert, update on public.web_testimonios from authenticated;
grant insert (lead_id, cliente, ciudad, texto, vehiculo, foto_ruta, publicado, orden) on public.web_testimonios to authenticated;
grant update (lead_id, cliente, ciudad, texto, vehiculo, foto_ruta, publicado, orden) on public.web_testimonios to authenticated;

-- C13 · registrar el consentimiento: quién lo registra es quien llama; registrarlo de nuevo tras retirarlo lo reactiva (D11).
create or replace function public.web_testimonio_consentir(
  p_testimonio uuid, p_actualizado_en_esperado timestamptz, p_canal text, p_ciudad boolean, p_vehiculo boolean, p_foto boolean
) returns timestamptz
language plpgsql security definer
set search_path = ''
as $$
declare t public.web_testimonios; v_canal text := btrim(p_canal);
begin
  perform public.assert_permiso('web.contenido.gestionar');
  select * into t from public.web_testimonios where id = p_testimonio for update;
  if not found then
    raise exception 'No encontramos este testimonio.' using errcode = 'P0002';
  end if;
  perform public._exigir_version(t.actualizado_en, p_actualizado_en_esperado,
    'Alguien cambió este testimonio mientras lo veías. Recarga para seguir.');
  if v_canal is null or char_length(v_canal) not between 1 and 80 then
    raise exception 'Escribe por qué canal dio su consentimiento.' using errcode = '22023', hint = 'canal';
  end if;
  if p_ciudad is null or p_vehiculo is null or p_foto is null then
    raise exception 'Di si consintió mostrar la ciudad, el vehículo y la foto.' using errcode = '22023', hint = 'consentimiento';
  end if;
  update public.web_testimonios set
    consent_por = (select auth.uid()), consent_en = now(), consent_canal = v_canal,
    consent_ciudad = p_ciudad, consent_vehiculo = p_vehiculo, consent_foto = p_foto, consent_retirado_en = null
   where id = p_testimonio
  returning actualizado_en into t.actualizado_en;
  return t.actualizado_en;
end;
$$;

-- C14 · retirar el consentimiento: despublica. Ya retirado, devuelve la versión sin escribir.
create or replace function public.web_testimonio_retirar(p_testimonio uuid, p_actualizado_en_esperado timestamptz) returns timestamptz
language plpgsql security definer
set search_path = ''
as $$
declare t public.web_testimonios;
begin
  perform public.assert_permiso('web.contenido.gestionar');
  select * into t from public.web_testimonios where id = p_testimonio for update;
  if not found then
    raise exception 'No encontramos este testimonio.' using errcode = 'P0002';
  end if;
  perform public._exigir_version(t.actualizado_en, p_actualizado_en_esperado,
    'Alguien cambió este testimonio mientras lo veías. Recarga para seguir.');
  if t.consent_por is null then
    raise exception 'Este testimonio no tiene un consentimiento registrado.' using errcode = '22023', hint = 'consentimiento';
  end if;
  if t.consent_retirado_en is not null then
    return t.actualizado_en;
  end if;
  update public.web_testimonios set consent_retirado_en = now(), publicado = false
   where id = p_testimonio
  returning actualizado_en into t.actualizado_en;
  return t.actualizado_en;
end;
$$;

revoke all on function public.web_testimonio_consentir(uuid, timestamptz, text, boolean, boolean, boolean) from public, anon;
grant execute on function public.web_testimonio_consentir(uuid, timestamptz, text, boolean, boolean, boolean) to authenticated, service_role;
revoke all on function public.web_testimonio_retirar(uuid, timestamptz) from public, anon;
grant execute on function public.web_testimonio_retirar(uuid, timestamptz) to authenticated, service_role;
