# Scripts internos

Este diretório reúne helpers CLI usados para validar regras sem passar pela UI.

## 1) Commission helper

Usa o `CommissionService` para calcular comissão direta e cálculo inverso.

### Comandos

```bash
npm run helper -- from-price --price 500 --seller cnpj --payment pix --orders 0 --campaign false
npm run helper -- from-net --net 404 --seller cnpj --payment card_or_boleto --orders 0 --campaign false
```

### Parâmetros

- `from-price`:
  - `--price` (number)
  - `--seller` (`cnpj` | `cpf`)
  - `--payment` (`card_or_boleto` | `pix`)
  - `--orders` (number)
  - `--campaign` (`true` | `false`)
- `from-net`:
  - `--net` (number)
  - demais iguais ao modo acima

Parâmetros opcionais de regra:
- `--campaign-rate` (decimal, ex: `0.025`)
- `--cpf-extra-fee` (number)
- `--cpf-threshold` (number)
- `--cnpj-low` (number)
- `--cpf-low` (number)

## 2) Best-price helper

Calcula preço cheio por variação com base em:
- líquido alvo por variação
- desconto desejado
- contexto de comissão (CPF/CNPJ, Pix/cartão, etc.)

### Comandos

```bash
npm run helper:best-price -- --input ./scripts/sample-best-price-input.json
npm run helper:best-price -- --input ./scripts/sample-best-price-input.json --csv ./saida-precos.csv
```

### Entrada JSON

Arquivo de exemplo: `scripts/sample-best-price-input.json`

Campos principais:
- `context`
  - `sellerType`
  - `paymentMethod`
  - `ordersLast90Days`
  - `includeCampaignExtra`
  - `couponRate` (opcional): percentual de cupom da loja em decimal (ex: `0.1` = 10%).
  - `couponMaxDiscount` (opcional): teto de desconto do cupom em reais.
- `items[]`
  - `productName` (opcional)
  - `variationName`
  - `cost` (opcional): custo da variação para você (produção/compra), em reais.
  - `targetNet`: quanto você quer receber líquido por venda da variação, já após comissão.
  - `desiredDiscountRate`: desconto desejado no formato decimal (ex: `0.12` = 12% no de/por).
- `discountCandidates[]` (opcional): lista de descontos candidatos para sugerir melhor preço cheio.

Observação:
- Para calcular preço cheio, você precisa de `targetNet` e `desiredDiscountRate`.
- `cost` é usado só para cálculo de margem (quando informado).
- Cupom da loja é aplicado sobre o preço \"por\" (após de/por). Ele reduz o valor pago pelo comprador, reduz o líquido recebido e também a comissão.

### Saída

- Console com resumo por variação.
- CSV opcional com:
  - custo
  - líquido alvo
  - preço de venda necessário (por)
  - desconto desejado
  - preço cheio para desconto desejado
  - desconto/preço sugeridos
  - comissão efetiva e margem
