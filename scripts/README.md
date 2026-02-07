# Scripts internos

Este diretório mantém 2 helpers CLI para cálculo fora da UI.

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
    { "variationName": "10 pecas", "fullPrice": 80.02, "discountPercent": 50 }
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
- `rate`: percentual do cupom (`0.03` ou `3`).
- `maxDiscount`: teto do desconto em reais.
- `items[].discountPercent`: aceita `50` ou `0.5`.

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
- `target-too-high`: alvo maior que o líquido sem desconto
- `max-discount-cap-reached`: até 99% de desconto ainda sobra líquido acima do alvo
