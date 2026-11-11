-- La hora del último mensaje no pasa de la hora actual (paso 7.08-1, auditoría del informe, hallazgo 1).
--
-- Hasta que 7.08-2 quite la escritura directa de `mensajes`, un miembro puede insertar un mensaje con `creado_en` en el futuro; como
-- `ultimo_mensaje_en` nunca retrocede, su conversación quedaría arriba de la lista para siempre. El trigger la acota a `clock_timestamp()`.

create or replace function public._chat_mover_ultimo_mensaje() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
declare v timestamptz := least(new.creado_en, clock_timestamp());
begin
  update public.conversaciones c set ultimo_mensaje_en = v
   where c.id = new.conversacion_id and c.ultimo_mensaje_en < v;
  return null;
end;
$$;
