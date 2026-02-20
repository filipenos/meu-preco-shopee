# Referencia Shopee ate 28/02/2026

Pacote local da politica antiga separado por tipo de vendedor para comparacoes historicas.

## Captura

- CPF: `https://seller.shopee.com.br/edu/article/18484/como-funciona-o-adicional-de-comissao-para-vendedores-CPF`
- CNPJ: `https://seller.shopee.com.br/edu/article/18483/como-funciona-a-politica-de-comissao-para-vendedores-shopee`
- Data de captura: `20/02/2026`
- Vigencia alvo: `ate 28/02/2026`

## Estrutura

- `cpf/policy-source.html`
- `cpf/policy-source.txt`
- `cpf/rules.json`
- `cpf/examples.json`
- `cnpj/policy-source.html`
- `cnpj/policy-source.txt`
- `cnpj/rules.json`
- `cnpj/examples.json`

## Uso

- Contrato legado: `tests/contracts/shopee-2026-02-28.contract.test.ts`
- Esses arquivos servem para comparar politica antiga vs nova sem perder historico.
