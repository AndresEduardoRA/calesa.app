-- El relleno de miniaturas (`avatar_miniatura_guardar`, `avatar_miniatura_fallo`) movía `perfiles.actualizado_en` por el
-- trigger genérico de la versión: quien tuviera su perfil abierto recibía un conflicto falso al guardar (lo encontró la
-- revisión del cierre 1). Ahora, si lo único que cambia es la miniatura o su fallo, la versión queda. Corre después de
-- `trg_actualizado_en` (los triggers `before` van por nombre) y ahora también cuando cambia sólo el fallo.

create or replace function public.perfil_avatar_coherente()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.avatar_ruta is distinct from old.avatar_ruta then
    new.avatar_miniatura_fallo_en := null;
    -- Cambió el avatar y la miniatura no: era la del anterior.
    if new.avatar_miniatura_ruta is not distinct from old.avatar_miniatura_ruta then
      new.avatar_miniatura_ruta := null;
    end if;
  end if;
  if new.avatar_miniatura_ruta is distinct from old.avatar_miniatura_ruta and new.avatar_miniatura_ruta is not null then
    -- La carpeta es la persona, como el avatar (la policy de Storage sólo deja subir a la propia).
    if split_part(new.avatar_miniatura_ruta, '/', 1) <> new.id::text then
      raise exception 'La miniatura no es de esta persona.' using errcode = '22023', hint = 'avatar_miniatura_ruta';
    end if;
    perform public.storage_gc_rescatar('avatares', new.avatar_miniatura_ruta);
  end if;
  -- La miniatura y su fallo no son algo que la persona edite: si es lo único que cambió (el relleno), la versión del perfil
  -- no se mueve. Si no, quien tenga el perfil abierto recibiría «Tu perfil cambió» sin que nadie lo haya editado.
  if (to_jsonb(new) - array['avatar_miniatura_ruta', 'avatar_miniatura_fallo_en', 'actualizado_en'])
     = (to_jsonb(old) - array['avatar_miniatura_ruta', 'avatar_miniatura_fallo_en', 'actualizado_en']) then
    new.actualizado_en := old.actualizado_en;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_perfil_avatar_coherente on public.perfiles;
create trigger trg_perfil_avatar_coherente before update of avatar_ruta, avatar_miniatura_ruta, avatar_miniatura_fallo_en
  on public.perfiles for each row execute function public.perfil_avatar_coherente();
