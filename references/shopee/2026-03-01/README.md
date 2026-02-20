# Referencia Shopee 2026-03-01

Pacote local de referencia para validacao e regressao da politica de comissao usada pelo projeto.

## Captura

- Origem: `https://seller.shopee.com.br/edu/article/26839/Comissao-para-vendedores-CNPJ-e-CPF-em-2026`
- Data de captura: `20/02/2026`
- Vigencia alvo: `01/03/2026`

## Arquivos

- `policy-source.html`: snapshot HTML bruto retornado pela URL oficial em `20/02/2026`.
- `policy-source.txt`: resumo textual operacional consolidado para leitura rapida.
- `rules.json`: regras estruturadas de comissao utilizadas como baseline.
- `examples.json`: cenarios de entrada/saida esperada para contrato.

## Uso

- Teste de contrato: `tests/contracts/shopee-2026.contract.test.ts`
- O contrato valida:
  - que as regras default do dominio batem com `rules.json`;
  - que os cenarios de `examples.json` produzem exatamente as saidas esperadas.
