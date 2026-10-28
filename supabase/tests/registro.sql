-- El registro se cierra en la base, no sólo en la interfaz (`auth_registro_permitido()`, el trigger diferido sobre `auth.users`; docs/ENTORNOS.md
-- › «Registro»). `humo.sql` ya prueba el primero dueño, el segundo sin marca rechazado y la marca que llega después. Aquí, lo demás que
-- llega a Auth: Google, el registro abierto y lo que la recuperación de contraseña le hace a una cuenta que ya existe. Corre después de
-- `humo.sql` (ya hay personas) y cada bloque deja la base como la encontró.

-- @test con el registro cerrado, una cuenta nueva de Google (sin la marca de invitación) no entra
begin;
update public.ajustes_empresa set registro_abierto = false where id = 1;
do $$
begin
  set constraints all immediate;
  begin
    insert into auth.users (id, email, raw_app_meta_data)
      values ('00000000-0000-0000-0000-00000000a001', 'google@ejemplo.com', '{"provider": "google", "providers": ["google"]}');
    raise exception 'el registro cerrado dejó pasar una cuenta nueva de Google';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- @test con el registro abierto el alta pasa, y nace sin el rol de dueño
begin;
update public.ajustes_empresa set registro_abierto = true where id = 1;
set constraints all immediate;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000a002', 'abierto@ejemplo.com');
do $$
begin
  if exists (select 1 from public.usuarios_roles ur join public.roles r on r.id = ur.rol_id
             where ur.usuario_id = '00000000-0000-0000-0000-00000000a002' and r.clave = 'dueno') then
    raise exception 'una cuenta que no es la primera nació dueña';
  end if;
  if not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-00000000a002') then
    raise exception 'el alta con el registro abierto no creó el perfil';
  end if;
end $$;
rollback;

-- @test con el registro cerrado, cambiar una cuenta que ya existe (lo que hacen la recuperación y la invitación) no pasa por el candado
begin;
update public.ajustes_empresa set registro_abierto = false where id = 1;
set constraints all immediate;
update auth.users set raw_user_meta_data = raw_user_meta_data || '{"recuperando": true}' where id = '00000000-0000-0000-0000-000000000002';
do $$
begin
  if not exists (select 1 from auth.users where id = '00000000-0000-0000-0000-000000000002' and raw_user_meta_data ? 'recuperando') then
    raise exception 'el cambio de una cuenta existente no se aplicó';
  end if;
end $$;
rollback;
