# Serviço de cálculo Shopee

Fontes oficiais consultadas em **18/09/2026**. Implementação sem conciliação com extratos reais: **não certificada como 100% idêntica à Shopee**.

## Documentação relacionada

- [Políticas comerciais e catálogo de fontes](shopee-policies.md): regras, exceções e grau de confirmação.
- [Histórico das mudanças](shopee-policy-history.md): vigências, política atual em 18/09/2026 e mudança futura.

## Políticas por data

`rulesConfig.effectiveDate` recebe `YYYY-MM-DD`. Se omitido, usa a data atual em `America/Sao_Paulo`. Para resultados reproduzíveis, sempre informe a data de referência escolhida para a venda. Ainda não foi confirmado qual evento (criação, pagamento ou outro) a Shopee utiliza no corte de pedidos entre políticas. Uma instância mantém a data selecionada na construção; a UI captura a data ao carregar.

| Vigência | Taxa fixa até R$ 79,99 | Limite de item barato CNPJ | Campanha de Destaque |
| --- | --- | --- | --- |
| 01/03/2026 a 22/04/2026 | R$ 4 | R$ 8 | 2,5% |
| 23/04/2026 a 30/09/2026 | R$ 4 | R$ 8 | 3,5% |
| A partir de 01/10/2026 | R$ 4,50 | R$ 9 | 3,5% |

Demais faixas: 14% + R$ 16 (R$ 80–99,99), R$ 20 (R$ 100–199,99), R$ 26 (R$ 200 em diante). Não existe teto geral de comissão. CPF com **mais de** 450 pedidos em 90 dias recebe adicional de R$ 3, ressalvada a regra regressiva de itens baratos. A taxa de transação já está incluída.

Fontes:

- [Anúncio de outubro, tabela e exemplo Pix](https://seller.shopee.com.br/edu/article/26839/Comissao-para-vendedores-CNPJ-e-CPF-em-2026)
- [Comissão CNPJ e compensações em disputas](https://seller.shopee.com.br/edu/article/18483/como-funciona-a-politica-de-comissao-para-vendedores-shopee)
- [Comissão CPF](https://seller.shopee.com.br/edu/article/18484/como-funciona-o-adicional-de-comissao-para-vendedores-CPF)
- [Campanhas de Destaque: 3,5% desde 23/04/2026](https://seller.shopee.com.br/edu/article/18712)
- [Ausência de teto de comissão](https://seller.shopee.com.br/edu/article/8899)

A seleção utiliza a última política cadastrada; não consulta a Shopee em tempo real. Novas alterações posteriores à consulta exigem revisão. Campanhas especiais podem ter outro percentual; um override é identificado como regra personalizada.

## Unidades e arredondamento

- Valores monetários de entrada/saída: reais, como `78.75`.
- Operações monetárias: centavos inteiros; multiplicações percentuais usam `BigInt`.
- Taxas nos serviços: **somente frações de 0 a 1**, até seis casas decimais. `0.01` = 1%, `0.5` = 50%, `1` = 100%. `50` é rejeitado.
- Campos de porcentagem da UI: `1` = 1%; a conversão ocorre apenas na interface.
- Arredondamento adotado: metade para cima para valores positivos, por componente; depois os componentes são somados/subtraídos em centavos. Valores negativos são arredondados simetricamente.
- Essa convenção garante consistência do demonstrativo, mas **a granularidade e ordem de arredondamento da Shopee ainda precisam ser conciliadas**.
- Entradas inválidas, taxas ambíguas, valores negativos em preços/custos e datas não suportadas geram erros. A UI exibe erros em vez de manter um resultado antigo.
- Limite operacional: R$ 100.000.000 por valor de entrada/subtotal e na busca de preço. Não é um limite comercial oficial da Shopee.

## Simulação de um item

```ts
import { calculateNetFromFullPrice } from '../src/services/net-from-full-price-service'

const [result] = calculateNetFromFullPrice({
  rulesConfig: { effectiveDate: '2026-09-18' },
  context: {
    sellerType: 'cnpj',
    paymentMethod: 'pix',
    includeCampaignExtra: false,
    pixSubsidyRateOverride: 0.08,
  },
  items: [{ variationName: 'Exemplo sintético', fullPrice: 500, discountPercent: 0 }],
})
// Comissão líquida: 56; subsídio Pix: 40; líquido: 404.
```

`items` nesses helpers representa **simulações independentes**, não um carrinho. `finalBuyerPrice` nos helpers mantém o significado histórico de preço após cupom e antes do subsídio Pix; o pagamento efetivo do item é esse preço menos `pixSubsidyAmount`.

`pixSubsidyRateOverride` informa o percentual escolhido para a simulação (0 a 0,08), limitado ao máximo de cada faixa. Não comprova elegibilidade nem substitui a conferência do pedido.

Os serviços de preço inverso retornam o menor preço em centavos que satisfaz a meta dentro do modelo. A busca separa faixas, limiares de itens baratos e ativação de cupons, e recalcula o preço efetivamente retornado. O desconto inverso busca de 0% a 99% em passos de 0,01 ponto percentual, sem pressupor que o líquido seja monotônico. Essa precisão é uma convenção do serviço, não uma confirmação do formato aceito em toda ferramenta promocional da Shopee.

## Pedido com várias unidades

Use `calculateOrderPricing` em `src/services/order-pricing-service.ts`:

```ts
import { calculateOrderPricing } from '../src/services/order-pricing-service'

const result = calculateOrderPricing({
  rulesConfig: { effectiveDate: '2026-09-18' },
  context: { sellerType: 'cnpj' },
  items: [{ variationName: 'Exemplo sintético', unitPrice: 20, quantity: 2 }],
  storeCoupon: { minPrice: 30, rate: 0.1, maxDiscount: 3 },
  sellerLogisticsFreightDiscount: 40,
  additionalCosts: { affiliateCommission: 2, sellerCoins: 1 },
})
```

O mínimo e o teto do cupom são aplicados uma vez ao subtotal elegível informado. Cada unidade recebe comissão separada. O rateio padrão é proporcional, distribuindo centavos restantes pelas maiores frações e desempate por ordem de entrada. **Esse rateio é uma estimativa, não uma regra oficial confirmada.** Para reproduzir um pedido, informe `couponAllocationAmounts`, um valor por unidade, cuja soma deve ser igual ao cupom. Cupons restritos a apenas parte de um carrinho não são modelados automaticamente; informe apenas o conjunto elegível ou concilie separadamente.

Cupons aceitam `rate` ou `amount` (exclusivos), `minPrice` e `maxDiscount`. [Tipos de cupons oficiais](https://seller.shopee.com.br/edu/article/2621).

Em pedidos, `finalBuyerPrice` representa o total dos itens **já descontando Pix**, sem frete do comprador. O líquido é o repasse dos itens menos os custos informados; não representa o fluxo completo de recebimento/pagamento de transporte contratado pelo vendedor.

## Custos adicionais e devoluções

- `sellerLogisticsFreightDiscount`: desconto de frete efetivamente utilizado, somente para logística do vendedor. Coparticipação = 25%, com teto de R$ 10, uma vez por pedido. [Fonte](https://seller.shopee.com.br/edu/article/25794/Operacoes-e-Politicas-da-Logistica-do-Vendedor).
- `additionalCosts`: valores conhecidos em reais de `affiliateCommission`, `sellerCoins`, `shippingAdjustment`, `returnShipping` e `other`. Por item nos helpers, por pedido no serviço de pedido. Não se infere percentual de afiliado, impostos ou tarifação de Full/Ads; informe o custo efetivo sem duplicar a campanha ou a comissão padrão.
- [Afiliados do Vendedor](https://seller.shopee.com.br/edu/article/24595), [diferenças de frete](https://seller.shopee.com.br/edu/article/4478), [componentes do recebimento](https://seller.shopee.com.br/edu/article/19426).
- `calculateReversedOrderSettlement`: cancelamento/devolução integral sem compensação tem comissão zero. Se houver compensação, exige `chargedCommissionAmount` observado. A política pública não basta para inventar o rateio da taxa fixa em disputas. Custos remanescentes devem ser informados.

## Pendências explícitas

Os resultados de precificação dos serviços contêm `audit` com data, versão da política e avisos. As funções de reversão e conciliação retornam apenas seus campos específicos; o cálculo direto de domínio não preenche a data/versão que são responsabilidade do serviço. Os avisos também são exportados no CSV.

| Aviso | Significado |
| --- | --- |
| `rounding-not-reconciled` | Arredondamento contábil adotado ainda não validado contra extratos reais |
| `cpf-low-price-unverified` | Interpolação histórica abaixo de R$ 12 não documentada integralmente pela Shopee |
| `pix-rate-assumed` | O modelo assumiu 8%, mas a página anuncia até 8% |
| `campaign-pix-base-unverified` | Base da campanha após Pix é hipótese não confirmada |
| `coupon-commission-base-unverified` | Comissão/faixa após cupom depende de validação externa |
| `order-coupon-allocation-unverified` | Rateio proporcional estimado |
| `custom-rules` | Parâmetros diferentes da política cadastrada |

Os pontos de CPF R$ 8 → R$ 6 e R$ 10 → R$ 6,50 aparecem na página oficial para o cenário com adicional. Isso não comprova a interpolação, a extensão abaixo de R$ 8, a tabela sem adicional nem o comportamento desses pontos em outubro. A aproximação anterior foi preservada **com aviso**, não promovida a política certificada.

## Conciliação centavo a centavo

`reconcileAmounts(calculated, statement)` compara os campos monetários fornecidos e retorna diferenças em centavos. O chamador escolhe campos equivalentes: comissão bruta, comissão após incentivo, campanha e líquido não são intercambiáveis. O resultado `matches` vale somente para os campos apresentados, não certifica toda a política.

A função não grava dados nem imprime extratos. Exemplos comerciais reais devem ser usados apenas em memória, anonimizados, sem serem colocados em testes, documentação ou logs. Os testes versionados usam exemplos públicos e sintéticos.

Ainda são necessários exemplos de CPF barato, Pix com campanha, cupons com várias unidades, compensação de disputa e valores que produzam frações de centavo. Somente após essa conciliação será possível afirmar correspondência para esses cenários.

## Sugestão de preço menor

`compareLowerPrices` (`src/services/lower-price-service.ts`) recebe `fullPrice`,
`context` e `rulesConfig`. Retorna o cálculo `current` e uma `suggestion` opcional
com `suggestedPrice`, `priceReduction`, `netGain` e o cálculo completo `outcome`.

A busca considera preços de R$ 0,01 até um centavo abaixo do preço informado.
Maximiza o líquido estimado, preservando vendedor, pagamento, pedidos, campanha,
cupom, custos e data de vigência. O cupom e a faixa são recalculados em cada preço.
Em empate de líquido máximo, escolhe o menor preço. Só recomenda se o ganho for
pelo menos R$ 0,01; caso contrário, `suggestion` é `null`.

A implementação busca metas de líquido usando a busca existente por intervalos,
pois o líquido não cresce continuamente entre faixas. Não percorre todos os
centavos em produção. Os testes comparam o resultado com uma busca exaustiva.

Exemplo em 18/09/2026, CNPJ, cartão/boleto, sem campanha nem cupom:
R$ 102,00 → R$ 67,72 líquidos; R$ 99,99 → R$ 69,99 líquidos.
A redução de R$ 2,01 aumenta o líquido em R$ 2,27 por item.

A página mostra a sugestão somente quando vantajosa e permite aplicar o preço
com um botão. Os avisos de auditoria do resultado sugerido também são exibidos.
A otimização segue as mesmas hipóteses documentadas do cálculo; não estima
mudanças de demanda, frete para o comprador nem lucro após custo do produto.
