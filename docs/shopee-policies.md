# Políticas de taxas da Shopee

**Data de referência: 18/09/2026. Última consulta às fontes: 18/09/2026.**

Este documento descreve as regras comerciais consideradas pelo projeto. “Atual” significa vigente na data de referência acima, não uma consulta automática à Shopee. A política de outubro já foi anunciada, mas ainda não está vigente nessa data.

- [Histórico e datas de mudanças](shopee-policy-history.md)
- [Contrato e uso do serviço](calculation-service.md)
- [Fontes e datas das páginas](#fontes-e-datas-das-páginas)
- [Pendências de confirmação](#pendências-de-confirmação)

## Como interpretar o nível de confirmação

| Classificação | Significado |
| --- | --- |
| Confirmado em fonte oficial | A página consultada declara a regra ou apresenta o exemplo indicado |
| Anunciado | A Shopee publicou uma alteração com vigência futura |
| Convenção do simulador | Decisão de implementação que não deve ser atribuída à Shopee |
| Pendente | As fontes disponíveis não permitem determinar toda a regra |
| Registro histórico local | Informação preservada pelo projeto, sem comprovação independente de todos os detalhes |

Uma regra publicada não comprova a ordem de arredondamento de todas as combinações de descontos. Testes locais verificam o modelo implementado; não substituem conciliação com demonstrativos reais.

## Política vigente em 18/09/2026

A versão do serviço é `2026-04-23`: tabela por faixas introduzida em 01/03/2026, com campanha atualizada em 23/04/2026. Valores abaixo são por item, antes de eventual campanha, adicional CPF e outros custos específicos da operação.

| Preço do item | Percentual | Parcela fixa | Subsídio Pix publicado |
| --- | --- | --- | --- |
| Até R$ 79,99 | 20% | R$ 4,00 | Não indicado para esta faixa |
| R$ 80,00 a R$ 99,99 | 14% | R$ 16,00 | 5% |
| R$ 100,00 a R$ 199,99 | 14% | R$ 20,00 | 5% |
| R$ 200,00 a R$ 499,99 | 14% | R$ 26,00 | 5% |
| R$ 500,00 em diante¹ | 14% | R$ 26,00 | Até 8% |

A taxa de transação já está contemplada no percentual divulgado; não somar outro percentual de processamento por conta própria. A comissão incide sobre o produto, não sobre o frete. [Política CNPJ — S2](https://seller.shopee.com.br/edu/article/18483/como-funciona-a-politica-de-comissao-para-vendedores-shopee)

Não existe teto geral máximo de comissão por item na política atual. [Perguntas frequentes — S5](https://seller.shopee.com.br/edu/article/8899)

¹ A tabela usa a expressão “acima de R$ 500”, mas o exemplo oficial usa exatamente R$ 500 com subsídio de 8%. O projeto inclui R$ 500 na última faixa seguindo esse exemplo. Nos demais limites, as faixas do modelo são contínuas em centavos: R$ 80, R$ 100 e R$ 200 já iniciam a faixa seguinte. A redação “acima de” em algumas imagens não deve ser interpretada como uma lacuna de preço. [Tabela e exemplo — S1](https://seller.shopee.com.br/edu/article/26839/Comissao-para-vendedores-CNPJ-e-CPF-em-2026)

## Alteração anunciada para 01/10/2026

| Regra | Até 30/09/2026 | Desde 01/10/2026 |
| --- | --- | --- |
| Parcela fixa para item até R$ 79,99 | R$ 4,00 | R$ 4,50 |
| Limite de item barato CNPJ | Preço abaixo de R$ 8,00 | Preço abaixo de R$ 9,00 |
| Percentuais de comissão | 20% / 14% | Sem alteração anunciada |
| Parcelas fixas das demais faixas | R$ 16 / R$ 20 / R$ 26 | Sem alteração anunciada |
| Condições de subsídio Pix | 5% / até 8% | Sem alteração anunciada |
| Adicional CPF, quando aplicável | R$ 3,00 | Mantido no anúncio |

Para CPF com adicional, um item de R$ 20 passa de `20% + R$ 4 + R$ 3` para `20% + R$ 4,50 + R$ 3`. Isso não resolve a fórmula de CPF abaixo de R$ 12: ela permanece pendente.

O anúncio foi consultado em 18/09/2026 e a página informa atualização nessa data. **Data de atualização da página e data de vigência são diferentes.** [Anúncio — S1](https://seller.shopee.com.br/edu/article/26839/Comissao-para-vendedores-CNPJ-e-CPF-em-2026)

## CPF: volume de pedidos e itens baratos

O adicional de R$ 3 por item é aplicado quando o vendedor CPF **ultrapassa 450 pedidos nos últimos 90 dias**. O modelo interpreta literalmente esse limite: 450 não aplica; 451 aplica. A página também usa “menos de 450” em um subtítulo, mas esclarece no texto a isenção para quem não emite mais de 450 pedidos. O contador é informado pelo chamador; o serviço não consulta nem calcula o histórico da loja. [Política CPF — S3](https://seller.shopee.com.br/edu/article/18484/como-funciona-o-adicional-de-comissao-para-vendedores-CPF)

A Shopee descreve taxa regressiva para produtos CPF abaixo de R$ 12 e apresenta, no contexto do vendedor com adicional:

| Preço do produto | Taxa por item no exemplo oficial, além do percentual |
| --- | --- |
| R$ 8,00 | R$ 6,00 |
| R$ 10,00 | R$ 6,50 |

A página não publica uma fórmula completa para todos os preços. O código preserva a aproximação anterior:

| Cenário | Pontos utilizados pelo simulador | Classificação |
| --- | --- | --- |
| CPF com adicional | R$ 8 → R$ 6; R$ 10 → R$ 6,50; R$ 12 → R$ 7 | Exemplos de R$ 8 e R$ 10 confirmados; interpolação e extensão pendentes |
| CPF sem adicional | R$ 8 → R$ 3; R$ 10 → R$ 3,50; R$ 12 → R$ 4 | Hipótese histórica do simulador |
| Abaixo do primeiro ponto | Mantém a taxa do primeiro ponto | Convenção não confirmada |
| A partir de R$ 12 | Usa parcela fixa da faixa, mais adicional CPF quando aplicável | Regra padrão; o ramo regressivo termina antes de R$ 12 |

O adicional não é somado novamente à taxa regressiva estimada. Os pontos regressivos **não foram reajustados automaticamente em outubro**, porque a documentação consultada não define esse reajuste. Todo cálculo nesse ramo recebe `cpf-low-price-unverified`.

A página menciona até 7 dias úteis para cessar o adicional após a migração de CPF para CNPJ. O serviço troca o cálculo imediatamente conforme `sellerType`; não modela a atualização cadastral da Shopee. Para conciliar esse período, é necessário observar a cobrança efetiva. [S3](https://seller.shopee.com.br/edu/article/18484/como-funciona-o-adicional-de-comissao-para-vendedores-CPF)

## CNPJ: itens baratos

A parcela fixa é metade do preço do item quando o preço é inferior ao limite vigente. O percentual de comissão continua sendo cobrado. No limite exato, vale a parcela fixa padrão.

Exemplos sintéticos do modelo, sem Pix nem campanha:

| Data | Preço | Parcela percentual | Parcela fixa | Comissão | Líquido |
| --- | --- | --- | --- | --- | --- |
| 18/09/2026 | R$ 7,00 | R$ 1,40 | R$ 3,50 | R$ 4,90 | R$ 2,10 |
| 30/09/2026 | R$ 8,50 | R$ 1,70 | R$ 4,00 | R$ 5,70 | R$ 2,80 |
| 01/10/2026 | R$ 8,50 | R$ 1,70 | R$ 4,25 | R$ 5,95 | R$ 2,55 |
| 01/10/2026 | R$ 9,00 | R$ 1,80 | R$ 4,50 | R$ 6,30 | R$ 2,70 |

Fontes: [regra atual — S2](https://seller.shopee.com.br/edu/article/18483/como-funciona-a-politica-de-comissao-para-vendedores-shopee), [alteração do limite — S1](https://seller.shopee.com.br/edu/article/26839/Comissao-para-vendedores-CNPJ-e-CPF-em-2026).

## Campanhas de Destaque

Desde **23/04/2026**, o percentual geral divulgado é **3,5%**, adicional à comissão normal. Aplica-se a todas as vendas da loja durante a participação, inclusive itens não nomeados. Campanhas especiais podem ter condições diferentes. A inclusão efetiva e a saída do programa determinam o período de cobrança; a renovação automática pode manter a participação. [Campanhas — S4](https://seller.shopee.com.br/edu/article/18712)

No serviço:

- `includeCampaignExtra` indica se aquela venda está sujeita à campanha.
- `campaignExtraRate` permite informar uma condição específica; divergências do padrão ficam marcadas em `audit`.
- O histórico anterior a 23/04/2026 utiliza 2,5%, preservado na referência local de março.
- O modelo calcula a campanha sobre o valor do item após o Pix. **Essa base não foi confirmada pela página consultada** e recebe `campaign-pix-base-unverified` quando há Pix e campanha.

A página consultada informa atualização em 21/07/2026. Isso não muda a vigência de 23/04/2026 do percentual. Não confundir Campanha de Destaque com a comissão de Afiliados do Vendedor.

## Subsídio Pix e apresentação da comissão

O subsídio reduz o preço pago pelo comprador e é compensado na comissão. Não é receita extra a somar ao líquido. O exemplo oficial de R$ 500 apresenta:

| Componente | Cartão/boleto | Pix |
| --- | --- | --- |
| Preço cadastrado | R$ 500,00 | R$ 500,00 |
| Valor final do item na nota | R$ 500,00 | R$ 460,00 |
| Subsídio | R$ 0,00 | R$ 40,00 |
| Comissão após ajuste | R$ 96,00 | R$ 56,00 |
| Líquido recebido | R$ 404,00 | R$ 404,00 |

Este é um exemplo público, reproduzido pelo serviço, sem adicionais de campanha ou cupons. [Exemplo oficial — S1](https://seller.shopee.com.br/edu/article/26839/Comissao-para-vendedores-CNPJ-e-CPF-em-2026)

A última faixa anuncia **até 8%**. O padrão do modelo usa 8% com aviso; o chamador pode informar `pixSubsidyRateOverride`. O parâmetro não comprova elegibilidade. A fonte consultada não detalha todas as condições que podem reduzir o percentual.

Na conciliação, distinguir comissão bruta, incentivo/subsídio e comissão líquida. A Shopee informa mudanças de apresentação desde 16/12/2025, sem alteração do total cobrado por esse motivo. Somar um incentivo novamente a um valor já líquido pode duplicar o benefício. [Minha Renda — S10](https://seller.shopee.com.br/edu/article/19426)

## Cupons e cálculo por pedido

A Shopee oferece cupons de valor fixo, percentual e cashback em moedas. O percentual de cupom é descrito sobre o total da compra; cupons podem se restringir a produtos específicos. [Cupons — S9](https://seller.shopee.com.br/edu/article/2621)

No modelo, desconto promocional do produto ocorre primeiro; cupom da loja ocorre depois. No serviço de pedido, mínimo e teto são aplicados uma vez ao conjunto informado e o desconto é distribuído entre as unidades. O rateio proporcional por maiores restos é **convenção do simulador**, não fórmula oficial confirmada. É possível fornecer o rateio efetivo por unidade.

Ainda falta comprovar a seleção da faixa e a base de comissão em todas as combinações de cupom, Pix e campanha. As rotinas de múltiplos preços existentes nas telas são simulações independentes, não um carrinho. Cashback do vendedor entra como custo informado, não como um segundo cupom automático.

## Frete e logística

O programa divulga cupons de frete de até R$ 20 para itens até R$ 79,99, até R$ 30 para R$ 80–199,99 e até R$ 40 para itens descritos como acima de R$ 200. Há também cupons de 50% de desconto no frete para compras acima de R$ 10. Elegibilidade e penalizações podem limitar os benefícios. Esses valores são limites divulgados, não receitas automáticas do vendedor. A redação no limite exato de R$ 200 deve ser conferida quando relevante; o serviço não escolhe o cupom de frete automaticamente. [Programa de Frete Grátis — S6](https://seller.shopee.com.br/edu/article/23431)

Para **logística do vendedor**, como Intelipost/API de Frete:

- Coparticipação do vendedor: 25% do desconto aplicado pelo cupom, limitada a R$ 10.
- A Shopee assume os 75% restantes do desconto.
- Sem uso de cupom, não há essa coparticipação.
- Cupom de R$ 40 gera R$ 10 de coparticipação, uma vez por pedido.

Essa exceção impede descrever o programa como “sem coparticipação para todos”. A página consultada tem data de 24/04/2026; **não foi confirmada uma data inicial específica dessa fórmula**. Não atribuir automaticamente a ela vigência em 01/03/2026. O serviço aplica a fórmula quando o chamador informa o desconto de frete; não mantém uma tabela histórica própria de logística. [Logística do vendedor — S7](https://seller.shopee.com.br/edu/article/25794/Operacoes-e-Politicas-da-Logistica-do-Vendedor)

Divergências de peso/dimensões podem gerar cobrança adicional em até 90 dias após a entrega; a página permite contestação em até 12 meses após a entrega. Não há percentual fixo universal para esse ajuste; o serviço recebe o valor conhecido. [Frete adicional — S8](https://seller.shopee.com.br/edu/article/4478)

## Devoluções, cancelamentos e compensações

A política detalhada informa ausência de comissão em compras canceladas ou devolvidas com retorno do produto. Se houver compensação recebida pelo vendedor em uma disputa, há comissão sobre o valor recebido. Isso é mais específico que a frase genérica “não cobra em devoluções” de outras páginas. [S2](https://seller.shopee.com.br/edu/article/18483/como-funciona-a-politica-de-comissao-para-vendedores-shopee)

O serviço de reversão integral sem compensação retorna comissão zero. Com compensação, exige a comissão efetivamente cobrada, porque não foi documentado o rateio completo das parcelas fixas. Frete de devolução ou outros custos remanescentes devem ser informados separadamente. Reembolso parcial não é automaticamente tratado como reversão integral.

## Outros custos e limites de escopo

Afiliados do Vendedor têm comissão própria e regras de atribuição. A documentação distingue cobrança integral em venda direta e parcial em venda indireta; o serviço recebe o valor efetivo, sem presumir uma alíquota universal. [Afiliados — S11](https://seller.shopee.com.br/edu/article/24595)

Moedas custeadas pelo vendedor, ajustes de frete, frete de devolução e outros custos conhecidos podem ser deduzidos. O serviço não calcula automaticamente impostos, Ads, Full/Full+, armazenagem, antecipação, financiamento nem tarifas específicas de contratos. Esses custos não devem ser tratados como zero apenas por estarem fora do modelo. [Componentes de recebimento — S10](https://seller.shopee.com.br/edu/article/19426)

## Pendências de confirmação

| Tema | O que falta | Evidência necessária |
| --- | --- | --- |
| Arredondamento | Ordem, granularidade por unidade/linha/pedido e tratamento de frações | Demonstrativos com casos que geram meio centavo |
| CPF abaixo de R$ 12 | Fórmula completa, sem adicional, abaixo de R$ 8 e após outubro | Documento oficial complementar ou cobranças discriminadas nesses preços |
| Pix até 8% | Condições de aplicação abaixo do teto | Condição da oferta e detalhamento da venda |
| Pix + campanha | Base exata do adicional | Venda com subsídio e taxa de campanha separados |
| Cupons | Base da comissão, faixa e rateio por unidade | Pedido com várias unidades e descontos discriminados |
| Disputas | Rateio da comissão em compensação/reembolso parcial | Decisão e valores cobrados/creditados discriminados |
| Virada de política | Evento usado para escolher a regra em pedidos que atravessam a data | Orientação sobre criação, pagamento ou outro evento de corte |

`effectiveDate` é a data escolhida pelo chamador. O uso da data corrente em São Paulo é uma convenção do aplicativo; não prova qual evento de um pedido a Shopee usa na virada da política.

Dados reais de clientes ou da operação não devem ser gravados no repositório, em exemplos, documentação ou logs. A conciliação deve ocorrer em memória, por leitura autorizada. Fixtures versionadas devem ser públicas ou sintéticas.

## Fontes e datas das páginas

As páginas foram lidas renderizadas no navegador em 18/09/2026; imagens de tabelas e do exemplo Pix também foram inspecionadas. As URLs são mutáveis. Não há nova captura integral renderizada versionada desta consulta; este documento registra a síntese e suas limitações.

| ID | Artigo oficial | Data apresentada na consulta | Uso |
| --- | --- | --- | --- |
| S1 | [26839 — política CNPJ/CPF](https://seller.shopee.com.br/edu/article/26839/Comissao-para-vendedores-CNPJ-e-CPF-em-2026) | Cabeçalho 04/02/2026; atualização 18/09/2026 | Anúncio de outubro, faixas, Pix |
| S2 | [18483 — comissão CNPJ](https://seller.shopee.com.br/edu/article/18483/como-funciona-a-politica-de-comissao-para-vendedores-shopee) | Cabeçalho 01/03/2026; atualização 18/09/2026 | Base, item barato, compensações |
| S3 | [18484 — comissão CPF](https://seller.shopee.com.br/edu/article/18484/como-funciona-o-adicional-de-comissao-para-vendedores-CPF) | Cabeçalho 01/03/2026; atualização 18/09/2026 | Adicional e exemplos regressivos |
| S4 | [18712 — Campanhas de Destaque](https://seller.shopee.com.br/edu/article/18712) | Cabeçalho 23/04/2026; atualização 21/07/2026 | Taxa de 3,5% e abrangência |
| S5 | [8899 — dúvidas de políticas](https://seller.shopee.com.br/edu/article/8899) | Cabeçalho 01/03/2026 | Ausência de teto de comissão |
| S6 | [23431 — Frete Grátis](https://seller.shopee.com.br/edu/article/23431) | Cabeçalho 16/03/2026 | Benefícios e exceção logística |
| S7 | [25794 — logística do vendedor](https://seller.shopee.com.br/edu/article/25794/Operacoes-e-Politicas-da-Logistica-do-Vendedor) | Cabeçalho 24/04/2026 | Coparticipação de 25%, teto R$ 10 |
| S8 | [4478 — frete adicional](https://seller.shopee.com.br/edu/article/4478) | Cabeçalho 31/10/2025 | Ajustes e contestação |
| S9 | [2621 — cupons do vendedor](https://seller.shopee.com.br/edu/article/2621) | Cabeçalho 14/08/2025 | Tipos e abrangência de cupons |
| S10 | [19426 — Minha Renda](https://seller.shopee.com.br/edu/article/19426) | Cabeçalho 24/03/2026 | Componentes e apresentação do repasse |
| S11 | [24595 — Afiliados do Vendedor](https://seller.shopee.com.br/edu/article/24595) | Cabeçalho 17/04/2026; atualização 13/07/2026 | Comissão distinta da campanha |

Cabeçalhos são metadados editoriais, não datas de início de todas as regras contidas no artigo. Trechos históricos podem coexistir com imagens novas: priorizar a vigência explícita e registrar inconsistências, sem substituir retroativamente a política anterior.
