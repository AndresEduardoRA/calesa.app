## pedido-4 · el CI no cae si apt no responde (2026-11-11)

Pedido del carril c (5.03): el paso de chromium del job `e2e` usa un tope de 240 s con `--with-deps` y, si falla, instala chromium sin apt.

- e2e completo: no (pedido-4, sólo `.github/workflows/ci.yml`: lo prueba el CI del PR)
