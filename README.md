# PreçoMed

Consulta do preço máximo de medicamentos em compras públicas (PF e PMVG), a partir da
lista de conformidade da CMED/ANVISA. Pensado para compras de hospital público estadual em PE,
mas funciona para qualquer UF.

## Atualizar a lista CMED (todo mês)

1. Baixe o `xls_conformidade_gov_*.xlsx` no site da ANVISA/CMED e coloque na raiz do projeto.
2. `python scripts/converter_cmed.py` (gera `app/public/cmed-data.js`; precisa de `openpyxl`).
3. Faça commit e push em `main`.
4. `bash scripts/publicar_pages.sh`: compila o Angular e publica na branch `gh-pages` (GitHub Pages).

## Rodar localmente

```
cd app
npm install
npm start
```

Ferramenta de apoio: não é publicação oficial da CMED nem do PROCAPE.
