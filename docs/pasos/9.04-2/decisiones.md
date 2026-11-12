## 2026-11-12 — Paso 9.04-2: el rango de un campo numérico en la base (9-2)

- **Un valor que ya estaba fuera del rango no impide guardar** (duda 1 del PLAN, la recomendada): se valida un campo sólo si su valor cambió respecto del anterior. Cambiar el rango no revalida lo cargado; el impacto avisa cuántos quedan fuera.
- **`*_campo_crear` también recibe el rango** (`p_minimo`/`p_maximo` al final, con default): el alta de un campo numérico con límites es una sola llamada, y la 9.04-3 no necesita otra migración.
- **El impacto recibe `p_cambios jsonb`** (las claves `minimo`/`maximo`, como guardar) y no dos `numeric`: con dos `numeric` no se puede proponer «quitar un límite». Sin `p_cambios`, mide el rango vigente.
- **`fuera_de_rango` acotado a 51** (tope 50 y uno de más, `conteoAcotado(n, 50)`), como `fase_impacto`; null cuando el campo no es numérico o no tiene límites.
- **En vehículos rige para toda escritura que cambie el valor**, también la importación de la subasta (escribe con sesión): es el mismo trigger que ya valida el tipo. Si cambia el origen se valida todo, porque los campos son otros.
- **La base escribe los números del motivo sin separadores** (`trim_scale`): «"Edad" va de 18 a 99.». El formulario de la 9.04-3 los muestra con el locale.
- **Un límite en un campo que no es numérico se rechaza** (22023, `hint minimo`); si el tipo deja de ser numérico, el rango se va solo, como las opciones.
- **Un valor por defecto fuera del rango se rechaza** (`hint valor_defecto`): precargaría un valor que no se puede guardar.
- **Tres migraciones y tres commits** (validación, RPC de leads, RPC de orígenes), para no pasar de 300 líneas por archivo.
- **`lead_campo_guardar` y `lead_campo_impacto` figuran en `numero-global.sql` sin número de lead:** nombran el tipo `numero` (por el rango) y caen en el inventario por texto, pero devuelven una versión y conteos.
