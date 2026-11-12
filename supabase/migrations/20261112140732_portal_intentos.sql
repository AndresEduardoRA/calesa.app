-- El límite por IP del ingreso al portal (paso 8.07-1). El route handler `api/portal/ingresar` llama `web.portal_intento(ip)` antes de
-- `web.portal_login`: 10 intentos por ventana fija de 15 minutos y por huella; el 11.º da false (el handler responde 429 con Retry-After).
-- Cuenta todo intento, también los que entran bien: el límite va antes de saber si el login falla.
--
-- La IP no se guarda: la huella es HMAC-SHA256(ip, sal) con una sal al azar de Vault (`portal:sal`) que nunca sale de la base. Un sha256
-- sin clave de una IPv4 se adivina recorriendo las 2^32 direcciones; con la sal, no.
--
-- Un solo `insert … on conflict do update` por la clave primaria: dos pedidos a la vez de la misma IP se serializan en esa fila y ninguno se
-- pierde, sin candado de aplicación.

create table interno.portal_intentos (
  huella bytea primary key,
  ventana_desde timestamptz not null,
  cuenta int not null check (cuenta between 1 and 11)
);
comment on table interno.portal_intentos is
  'El límite por IP del ingreso al portal: una fila por huella (HMAC de la IP con la sal portal:sal; la IP no se guarda) con su ventana de 15 minutos y cuántos intentos lleva (tope 11). La escribe web.portal_intento() y la vacía portal_intentos_purgar().';
create index portal_intentos_ventana_desde_idx on interno.portal_intentos (ventana_desde);
alter table interno.portal_intentos enable row level security;
revoke all on table interno.portal_intentos from public, anon, authenticated;

-- La sal (32 bytes al azar, una sola vez).
do $$
begin
  if not exists (select 1 from vault.secrets s where s.name = 'portal:sal') then
    perform vault.create_secret(new_secret => encode(extensions.gen_random_bytes(32), 'hex'), new_name => 'portal:sal',
                                new_description => 'Sal de la huella del límite por IP del portal (8.07-1): la IP no se guarda');
  end if;
end $$;

create or replace function web.portal_intento(p_ip text) returns boolean
  language plpgsql volatile security definer set search_path = '' as $$
declare
  v_sal text;
  v_ip text := left(coalesce(nullif(btrim(p_ip), ''), 'desconocida'), 64);
  v_cuenta int;
begin
  select s.decrypted_secret into v_sal from vault.decrypted_secrets s where s.name = 'portal:sal';
  if v_sal is null then
    raise exception 'Falta la sal del portal.' using errcode = '55000';
  end if;
  -- Por la clave primaria (portal_intentos_pkey).
  insert into interno.portal_intentos as t (huella, ventana_desde, cuenta)
  values (extensions.hmac(convert_to(v_ip, 'UTF8'), decode(v_sal, 'hex'), 'sha256'), now(), 1)
  on conflict (huella) do update set
    ventana_desde = case when t.ventana_desde <= now() - interval '15 minutes' then now() else t.ventana_desde end,
    cuenta = case when t.ventana_desde <= now() - interval '15 minutes' then 1 else least(t.cuenta + 1, 11) end
  returning t.cuenta into v_cuenta;
  return v_cuenta <= 10;
end $$;
comment on function web.portal_intento(text) is
  'Cuenta un intento de ingreso al portal desde esa IP (la guarda sólo como huella con sal) y dice si todavía está dentro del límite: 10 por ventana de 15 minutos. Sólo service_role (el route handler).';
revoke all on function web.portal_intento(text) from public, anon, authenticated;
grant execute on function web.portal_intento(text) to service_role;
