## 2026-11-08 — Paso 4.23-2

- **Lo no obvio:**
  - **Primero la versión y después las filas.** Si alguien publica entre los pedidos, se mezclan filas viejas y nuevas, pero la versión leída es la vieja y
    publicar da PT409: nunca se pisan filas nuevas.
  - **La lectura es entera o nada.** `tabla_referencia_publicar()` borra todas las filas y pone las que recibe: una fila que no se lee, o más de 2.000, y
    `leerTablaParaEditar` no devuelve la tabla (el tipo no deja armar un pedido con una tabla cortada).
    - Se para sólo con una página vacía o con el tope + 1, nunca con una página corta: `max_rows` es del despliegue (en la nube no lo fija `config.toml`). Cuesta un
      pedido más: 3 con `max_rows` 1.000.
  - **El 22023 con `hint` va con el mensaje tal cual,** no por `errorDePostgrest`: «… la tabla no tiene la columna «x».» dice «column» y se cambiaría por el
    genérico (`src/shared/lib/errores.ts`). El PT409 también va tal cual.
  - **El espejo copia tres detalles de la base:** el largo en puntos de código (`char_length`), las claves por punto de código con un comparador propio
    (`collate "C"`; el `<` de JS compara unidades UTF-16 y difiere fuera del BMP) y la etiqueta recortada sólo de espacios U+0020 (`btrim`). Además rechaza un
    `\u0000` y un surrogate suelto, que la base rechaza fuera del 22023 al pasar a jsonb.
  - **Diferencia aceptada del espejo:** una `etiqueta` que no es texto (sólo por SQL, P5) cae a la clave; la base la muestra como texto con `->>`.
  - **Una celda es número, texto, nulo o booleano.** El booleano sólo entra por SQL: se conserva y la base lo rechaza al publicar con su celda. Una celda que es
    un objeto o una lista hace fallar la lectura: esa tabla no se edita desde la pantalla.
- **Para el coordinador:**
  - **Línea de ESTADO:** «B/C, 4.23-2: las tablas de referencia se leen enteras por cursor y se publican por una action (sigue el 4.23-3)».
  - **RENDIMIENTO:** «El editor de tablas lee una tabla entera por `(orden, id)` hasta una página vacía o el tope de 2.000 + 1: ≤ 3 pedidos con `max_rows`
    1.000». Se suma a la del 4.23-1.
  - **Copias en el área `tablas`** (un área no importa otra): la nota de publicar (`esquemaDeNotaDeTabla`, igual a `esquemaDeNota` de `formula`) y el pedido
    de 1.000 filas (`FILAS_POR_PEDIDO`, igual a `FILAS_POR_PAGINA` de `formula`). Si el A los quiere compartir, van al núcleo.
