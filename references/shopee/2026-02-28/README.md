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

## Status histórico

Este pacote representa o modelo legado registrado pelo projeto em 20/02/2026. As URLs oficiais são mutáveis e atualmente exibem regras posteriores; a consulta atual não revalida cada hipótese do modelo antigo. O seletor atual de políticas não aceita datas anteriores a 01/03/2026. Consulte o [histórico consolidado](../../../docs/shopee-policy-history.md) e a [política atual documentada](../../../docs/shopee-policies.md).

## Serviços legados de apoio aos testes

Os arquivos `services/legacy-cpf-commission-service.js` e `services/legacy-cnpj-commission-service.js` foram preservados como referência executável dos testes de contrato. Não são publicados no site. As antigas páginas HTML de cálculo e comparação foram removidas; a única página do aplicativo é a calculadora principal de comissão e líquido.
