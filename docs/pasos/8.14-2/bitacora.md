## 8.14-2 · El cierre de la Fase 8: el Nivel 3 y los docs de cierre (2026-11-13)

Parte 2 de 2: cierra el 8.14 y la Fase 8. Plan: `.piloto/planes/8.14-2.md`; la parte 1, `docs/pasos/8.14-1/`.

- **Unión con main** antes del Nivel 3: `origin/main` no había avanzado desde `3179fc8e` (la unión con el 9.06). Las cuatro funciones edge respondían,
  `importar-csv` incluida (la trajo el 9.06; `e2e-completo.mjs` sólo exige `apibara` y `storage-gc`). Después del Nivel 3 entró la integración del
  8.14-1 (`a71f2898`, el mismo árbol): unida en `8cb1af2d` sin repetir el completo (D2).
- **Nivel 3, por proyecto** (cada uno desde `db:reset` y `db:carreras`, 19,5 s y 23,5 s), los dos sobre `3179fc8e`: escritorio, 1.265 en verde, 17
  saltadas y 0 caídas en 52,7 min (54,3 de reloj); celular, 879 en verde, 31 saltadas, 1 caída y 1 sin correr (el resto de su serial) en 37,2 min (38,6
  de reloj). 5a-4b: 92,9 min de reloj los dos (91,5 en el 7.14-2). Ninguna saltada nueva sin motivo (`saltadas.mjs 9c329195..HEAD`: 0); el celular suma
  R3 del recorrido (`@sin-celular`). Salidas en `.piloto/salidas/8.14-2/`.
- **Triaje:** `vehiculos-vitrina` › «con el permiso se publica con su precio, mirando lo que verá el visitante» (celular): el ingreso por interfaz del
  arranque quedó en `/ingreso` con la página en blanco; la traza da `POST /ingreso` 200 sin redirigir. Sola, 3 de 3 verdes en el celular
  (`triaje-vehiculos-vitrina-{1,2,3}.log`): inestable, anotada y sin arreglar (pruebas sólo en lo clave: no se estabilizan inestables). Sin `fix`.
- **Base y mapa:** ningún cambio en `supabase/` (D5): la fila de la base usa el CI del PR sobre `910befb2` (reset, tipos, `db:probar`, `db:lint` y
  advisors, en verde). `mapa.sh --check` en verde.
- **PLAN › «Fase 8»:** «Tabla de criterios» (15 filas, con el hueco conocido **8-14a**) y «Cierre de la Fase 8»; la «Partición» marcada con fechas y docs
  de paso; «Total de la fase: 14 pasos y 45 partes»; **8-1** cerrado, «Los decide la persona» con 8-05a, 8-13a, 8-13c a 8-13f y 8-14a, los abiertos de la
  fase con su lugar (8-13b, la IP real, la seguridad de 8.10-1 y de los pagos) y «Cerrados en la fase» (los arrastrados y las contradicciones 1 a 6);
  «Riesgos y huecos» con lo que resolvió cada paso. En **7-5**, la mitad que cerró el 8.12-ci.
- **Fichas** de `web` y `repuestos` con la línea «Fase 8 cerrada» y sus abiertos.
- **ESTADO** por sustitución (60 líneas): una sola «Fase actual» (la 9), la Fase 8 en «Funcionando», el completo del 8.14-2, 5a-4b, los abiertos 8-x y,
  de la deuda, fuera `datos.exportar.todo` (ya sin excepciones en `permisos-enforcement.sql`) y el logo oscuro (lo hizo el 9.10).
- **Consolidados** antes de esta parte: los docs de paso del 9.06 (1 a 5 y 4b), que llegaron con la unión.
- e2e completo: sí (8.14-2, cierre, Nivel 3: escritorio 1.265 en verde, 17 saltadas, 0 caídas, 52,7 min; movil 879 en verde, 31 saltadas, 1 caída, 37,2 min; la caída, inestable: 3 de 3 verdes sola)
