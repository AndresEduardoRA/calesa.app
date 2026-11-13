-- 9.13-1 · splinter `duplicate_index`: cuatro pares de índices btree idénticos sobre la misma columna, los dos de la base. Ninguno respalda una
-- restricción (`pg_constraint.conindid`). Se queda el que nombran las consultas, las mediciones y `docs/RENDIMIENTO.md`
-- (`usuarios_roles_rol_idx` lo afirma `supabase/tests/medir-equipo.sql`; `conversaciones_miembros_usuario_idx`, `chat_conversaciones()`), y se
-- borra el `*_id_idx`, que nada nombra. Mismo plan (es el mismo índice), una escritura menos por fila.
drop index if exists public.conversaciones_miembros_usuario_id_idx;
drop index if exists public.usuarios_roles_rol_id_idx;
drop index if exists public.vehiculos_interesados_lead_id_idx;
drop index if exists public.vehiculos_vinculos_lead_id_idx;
