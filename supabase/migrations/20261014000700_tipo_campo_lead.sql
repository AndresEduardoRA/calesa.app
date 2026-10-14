-- Dos tipos de campo para los leads: correo y documento. Escrito a mano.
--
-- Un valor nuevo de un enum no se puede usar en la transacción que lo crea: por eso va solo, y lo
-- que lo usa va en las migraciones siguientes. En `schemas/` ya están al final de la lista: en una
-- base nueva esto no hace nada. Van después de `lote` para que los dos caminos dejen el mismo orden.
alter type public.tipo_campo add value if not exists 'correo';
alter type public.tipo_campo add value if not exists 'documento';
