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

## Limites desta referência

O HTML capturado contém a estrutura da aplicação, não o texto renderizado completo da política. O resumo, as regras JSON e os cenários locais não constituem extratos reais nem prova independente de todas as fórmulas. O cenário sintético `cnpj_pix_100_with_campaign` registra líquido de R$ 63,63, incompatível com R$ 95,00 menos R$ 31,38; o arquivo foi preservado e o teste passa a exigir o saldo contábil de R$ 63,62. Essa diferença não representa uma confirmação do arredondamento praticado pela Shopee. Veja o [contrato do serviço](../../../docs/calculation-service.md).

## Atualizações posteriores

Este pacote não deve ser tratado como configuração atual: a campanha mudou em 23/04/2026 e há alteração anunciada para 01/10/2026. Consulte o [histórico consolidado](../../../docs/shopee-policy-history.md) e as [políticas detalhadas](../../../docs/shopee-policies.md). A data de captura (20/02/2026) não é a data de vigência (01/03/2026).
