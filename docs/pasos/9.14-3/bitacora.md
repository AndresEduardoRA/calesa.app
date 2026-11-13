## 9.14-3 · El cierre de la Fase 9: el Nivel 3 y los docs de cierre (2026-11-13)

Parte 3 de 3: cierra el 9.14 y la Fase 9, **lista para desplegar**. Plan: `.piloto/planes/9.14-3.md`; las partes 1 y 2, `docs/pasos/9.14-1/`, `9.14-2/`.

- **Unión con main** antes del Nivel 3: `origin/main` no había avanzado desde `20815f1c`. Las cinco funciones edge respondían (`apibara`, `storage-gc`,
  `avatares-miniaturas`, `importar-csv`, `push`). Después del Nivel 3 entró la integración del 9.14-2 (`53d742fe`, el mismo árbol): unida en `5b54bbd8`
  sin repetir el completo (D2).
- **Nivel 3, por proyecto** (cada uno desde `db:reset` y `db:carreras`, 18,8 s y 20,9 s), los dos sobre `20815f1c`: escritorio, 1.291 en verde, 17
  saltadas y 0 caídas en 54,1 min (55,6 de reloj); celular, 898 en verde, 31 saltadas y 0 caídas en 38,2 min (39,7 de reloj). 5a-4b: 95,3 min de reloj
  los dos (92,9 en el 8.14-2). Ninguna saltada nueva (`saltadas.mjs 3179fc8e..HEAD`: 0). El inestable de `leads-alta.spec.ts` pasó en los dos (D6).
  Sin caídas: sin triaje ni `fix`. Salidas en `.piloto/salidas/9.14-3/`.
- **El resto del assert**, tras los dos completos: `db:probar` 1.485 en verde, `db:lint` en verde, `pnpm despliegue:en-seco` en `listo` (lo de «Para la
  persona» ya está en `docs/DESPLIEGUE.md`), `mapa.sh --check` en verde y el CI del PR (sobre `dd9c525b`) en verde. `pnpm test`: 10.889 de 10.891; los
  2 rojos son pruebas del bucle que caen sólo con el entorno `PILOTO_*` de la sesión (con `env -i`, 15 de 15; D10). `lint` y `typecheck`: el hook del
  commit.
- **PLAN › «Fase 9»:** «Tabla de criterios» (16 filas, con el hueco conocido **9-14a**) y «Cierre de la Fase 9»; «Lo que la fase dejó fuera» (los 14
  «No entra», D8); la «Partición» marcada con fechas y docs de paso, «Hecho en tres» en la 9.14 y «Total de la fase: 14 pasos y 41 partes»; cerrados
  **4-41**, **5a-28**, **9-1** a **9-5** y **9-7** a **9-11** (9-11 salvo el dispatch), cada uno con su doc de paso; «Los decide la persona» con 9-6,
  9-11 (el dispatch), 9-12, 4-20, el R7 de `shared/ui` y **9-14a** (nace, D4); **9-13** abierto con su lugar (D5); «Cerrados en la fase» con las
  contradicciones 1 a 11; «Pulido para la Fase 9» con lo que cerró el 9.12 y el resto como pulido sin paso (D7); «Riesgos y huecos» con lo que resolvió
  cada paso. En **9-6**, **9-11**, **9-12** y **5a-4b** (Fase 4), la lista de la persona de `docs/DESPLIEGUE.md` (lo que pidió el 9.13-3).
- **Fichas** de `tablero`, `datos` y `actividad` con la línea «Fase 9 cerrada»; en `datos`, «RPC: `crear_lead` por fila» pasa a `importacion_crear()`
  con destino y `_lead_crear` vía `leads_importar_lote` (D9).
- **ESTADO** por sustitución (60 líneas): las fases 0 a 9 cerradas y lista para desplegar, la Fase 9 en «Funcionando», las cuatro tareas de oro, el
  despliegue en seco, el completo del 9.14-3, 5a-4b, los abiertos de la persona de las fases 4 a 9 (9-14a incluido) y, en la deuda, la línea del
  9.13-1 y «fotos en iPhone: en la lista de la persona».
- e2e completo: sí (9.14-3, cierre, Nivel 3: escritorio 1.291 en verde, 17 saltadas, 0 caídas, 54,1 min; movil 898 en verde, 31 saltadas, 0 caídas, 38,2 min)
