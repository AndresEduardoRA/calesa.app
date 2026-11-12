-- Vencer los turnos de la web (paso 8.04-1, C9; cierra el arrastrado «el job `web_expirar_solicitudes` se programa con esta fase»).
--
-- `web_expirar_solicitudes()` vence las asignadas sin contacto pasado su plazo y las pasa a la siguiente de la rueda (200 por corrida, su
-- límite por defecto). Existía desde la base pero nadie la llamaba. Cada 5 minutos, como el dueño de `cron`; sólo `service_role` la ejecuta
-- desde la app. El comando no lleva URL: es SQL de la base.

select cron.schedule('web-expirar-solicitudes', '*/5 * * * *', 'select public.web_expirar_solicitudes()');
