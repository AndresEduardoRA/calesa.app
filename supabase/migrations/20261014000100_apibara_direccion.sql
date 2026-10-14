-- La dirección de apibara. Escrito a mano.
--
-- El seed y la configuración de fábrica decían `https://api.apibara.tech`, un host que no es la
-- base de la API. La base real es `https://apibara.tech/api/v1/vehicle-auction` (documentación
-- oficial, verificada con llamadas reales). Quien nunca tocó la dirección la tiene guardada mal:
-- se corrige sólo esa. Una dirección que la persona escribió a propósito no se toca.
update public.integraciones
set config = jsonb_set(config, '{endpoint}', to_jsonb('https://apibara.tech/api/v1/vehicle-auction'::text))
where clave = 'apibara' and config ->> 'endpoint' = 'https://api.apibara.tech';
