-- 4-13 (paso 4.10, prompt 1): `_nivel_en_uso()` ya no tiene quien la llame.
--
-- La escribió el 4.08-2 para que `nivel_eliminar()` supiera si un nivel estaba en uso. Desde `…006500`, `nivel_eliminar()` pregunta por
-- `_nivel_motivo_de_uso()` (el único punto del texto, `…006600`), que cuenta con `_nivel_uso()` y no con `_nivel_en_uso()`: la última
-- desapareció de todo camino de la base y sólo la sostenían su propia prueba y una medición. Se quita, y las pruebas que la nombraban miran
-- `_nivel_uso()` con las mismas formas (una sección o un ítem, para ver y para editar, el borrador y la subcadena que no casa).
--
-- El índice `formulas_niveles_idx` y `_niveles_del_diseno()` se quedan: los usa `_nivel_uso()`.

drop function if exists public._nivel_en_uso(text);

comment on function public._nivel_uso(text) is
  'Cuántos orígenes, secciones y celdas nombran un nivel de acceso, contando sólo la versión más nueva de cada origen que lo nombra (el borrador, si lo nombra). Sólo la llama _nivel_motivo_de_uso(), que usan nivel_eliminar() y la lista de niveles (niveles_con_uso()).';
