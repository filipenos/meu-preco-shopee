# Scripts internos

Este diretório mantém, por enquanto, apenas o helper de cálculo de líquido por variação a partir do preço cheio.

## Net-from-full-price helper

Calcula o líquido por variação a partir de:
- `fullPrice` (preço cheio)
- `discountPercent` (desconto do de/por)
- `context.sellerType`

### Comandos

```bash
npm run helper -- --input ./scripts/test-data/dados.json
npm run helper -- --input ./scripts/test-data/dados.json --csv ./scripts/test-data/resultado.csv
```

Observação:
- `scripts/test-data/dados.json` é arquivo local e não versionado.

### Entrada JSON

- `context`
  - `sellerType` (obrigatório)
  - `paymentMethod` (opcional, default `card_or_boleto`)
  - `ordersLast90Days` (opcional, default `0`)
  - `includeCampaignExtra` (opcional, default `false`)
  - `storeCoupon` (opcional): objeto de cupom da loja
    - `minPrice` (opcional): valor mínimo para ativar cupom
    - `rate` (opcional): percentual do cupom (ex: `0.1` ou `10`)
    - `maxDiscount` (opcional): teto do desconto do cupom em reais
- `items[]`
  - `variationName`
  - `fullPrice`
  - `discountPercent` (`50` ou `0.5`)

### Saída

- preço com desconto por variação
- preço final do comprador após cupom (quando aplicável)
- comissão total por variação
- líquido por variação
- comissão efetiva

Ordem de cálculo:
1. aplica `discountPercent` sobre `fullPrice` (de/por do produto)
2. aplica `storeCoupon` sobre esse preço já com desconto (respeitando mínimo e teto)
3. calcula comissão Shopee e líquido em cima do preço final após cupom
