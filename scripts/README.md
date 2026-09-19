# Scripts internos

Este diretório mantém 3 helpers CLI para cálculo fora da UI.

**Mudança de contrato:** taxas agora aceitam somente frações de 0 a 1. Valores ambíguos ou inválidos geram erro. `items` são simulações independentes; para carrinhos use `calculateOrderPricing`. Defina `rulesConfig.effectiveDate` (`YYYY-MM-DD`) para fixar a política. Veja [serviço de cálculo](../docs/calculation-service.md).

Os resultados incluem avisos de regras ainda não conciliadas; passar nos testes não certifica igualdade com extratos reais. Custos adicionais conhecidos podem ser informados no contexto.

## Arquivo de entrada (`scripts/test-data/dados.json`)

- O caminho é sempre o mesmo: `scripts/test-data/dados.json`.
- Esse arquivo é local (não versionado).
- O formato do JSON muda conforme o helper executado.

## 1) Helper: líquido a partir de preço cheio

Comando:

```bash
npm run helper:net-from-full-price -- --input ./scripts/test-data/dados.json
npm run helper:net-from-full-price -- --input ./scripts/test-data/dados.json --csv ./scripts/test-data/resultado.csv
```

Pergunta que responde:
- "Com esse preço cheio e esse desconto, quanto sobra líquido?"

Entrada esperada (`dados.json`):

```json
{
  "context": {
    "sellerType": "cpf",
    "paymentMethod": "card_or_boleto",
    "ordersLast90Days": 0,
    "includeCampaignExtra": false,
    "storeCoupon": {
      "minPrice": 30,
      "rate": 0.03,
      "maxDiscount": 3
    }
  },
  "items": [
    { "variationName": "10 pecas", "fullPrice": 80.02, "discountPercent": 0.5 }
  ]
}
```

Parâmetros:
- `context.sellerType` obrigatório: `cpf` ou `cnpj`.
- `context.paymentMethod` opcional: default `card_or_boleto`.
- `context.ordersLast90Days` opcional: default `0`.
- `context.includeCampaignExtra` opcional: default `false`.
- `context.storeCoupon` opcional:
- `minPrice`: valor mínimo para aplicar cupom.
- `rate`: fração do cupom (`0.03` = 3%); `3` é inválido.
- `maxDiscount`: teto do desconto em reais.
- `items[].discountPercent`: aceita somente fração (`0.5` = 50%, `0.01` = 1%).

Saída por variação:
- preço com desconto do produto
- desconto do cupom
- preço final do comprador
- comissão total
- líquido
- comissão efetiva

## 2) Helper: desconto a partir do líquido alvo

Comando:

```bash
npm run helper:discount-from-net -- --input ./scripts/test-data/dados.json
npm run helper:discount-from-net -- --input ./scripts/test-data/dados.json --csv ./scripts/test-data/resultado.csv
```

Pergunta que responde:
- "Com esse preço cheio e líquido esperado, qual desconto devo cadastrar?"

Entrada esperada (`dados.json`):

```json
{
  "context": {
    "sellerType": "cpf",
    "paymentMethod": "card_or_boleto",
    "ordersLast90Days": 0,
    "includeCampaignExtra": false,
    "storeCoupon": {
      "minPrice": 30,
      "rate": 0.03,
      "maxDiscount": 3
    }
  },
  "items": [
    { "variationName": "10 pecas", "fullPrice": 80.02, "targetNet": 27 }
  ]
}
```

Parâmetros:
- `context`: mesma estrutura do helper anterior.
- `items[].targetNet`: líquido desejado por variação.

Saída por variação:
- `requiredDiscountPercent` (desconto calculado para cadastrar)
- preço com desconto
- efeito do cupom
- comissão total
- líquido alcançado
- `status`:
- `ok`: alvo atendido
- `target-too-high`: nenhum desconto de 0% a 99%, em passos de 0,01 ponto percentual, atende o alvo
- `max-discount-cap-reached`: até 99% de desconto ainda sobra líquido acima do alvo

## 3) Helper: preço cheio a partir do líquido alvo

Comando:

```bash
npm run helper:full-price-from-net -- --input ./scripts/test-data/dados.json
npm run helper:full-price-from-net -- --input ./scripts/test-data/dados.json --csv ./scripts/test-data/resultado.csv
```

Pergunta que responde:
- "Com esse desconto e líquido esperado, qual preço cheio devo cadastrar?"

Entrada esperada (`dados.json`):

```json
{
  "context": {
    "sellerType": "cpf",
    "paymentMethod": "card_or_boleto",
    "ordersLast90Days": 0,
    "includeCampaignExtra": false,
    "storeCoupon": {
      "minPrice": 30,
      "rate": 0.03,
      "maxDiscount": 3
    }
  },
  "items": [
    { "variationName": "10 pecas", "discountPercent": 0.5, "targetNet": 27 }
  ]
}
```

Parâmetros:
- `context`: mesma estrutura dos outros helpers.
- `items[].discountPercent`: desconto já decidido (`0.5` = 50%).
- `items[].targetNet`: líquido desejado por variação.

Saída por variação:
- `requiredFullPrice` (preço cheio sugerido)
- preço com desconto
- efeito do cupom
- comissão total
- líquido alcançado
- `status`:
- `ok`: alvo atendido
- `target-too-low`: alvo já é atendido com preço cheio `0`
- `target-too-high`: alvo não foi alcançado no limite de busca
