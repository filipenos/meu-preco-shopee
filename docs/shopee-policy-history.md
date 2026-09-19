# Histórico das políticas Shopee

**Estado registrado em 18/09/2026.** A cronologia distingue vigência comercial, edição da página e data de consulta. A [política detalhada](shopee-policies.md) contém fontes, exceções e pendências; o [contrato do serviço](calculation-service.md) explica como selecionar uma data.

## Linha do tempo

| Data/período | Evento | Classificação em 18/09/2026 | Efeito no projeto |
| --- | --- | --- | --- |
| Até 28/02/2026 | Modelo legado preservado em arquivos locais | Histórico local | Fora de `getCommissionRules`; apenas referências e testes legados |
| 01/03/2026 | Modelo por faixas de preço | Histórico suportado | Versão `2026-03-01` |
| 23/04/2026 | Campanha de Destaque passa de 2,5% para 3,5% | Vigente | Versão `2026-04-23`; comissão básica mantém as faixas de março |
| 18/09/2026 | Consulta e atualização indicada nas páginas de comissão | Data documental, não nova vigência de tarifa | Registro da alteração anunciada para outubro |
| 01/10/2026 | Parcela fixa inicial sobe R$ 0,50; limite de item barato CNPJ sobe R$ 1 | Anunciado | Versão `2026-10-01`, selecionada somente para datas a partir desse dia |

## Até 28/02/2026: arquivo legado

Os [arquivos locais de fevereiro](../references/shopee/2026-02-28/README.md), capturados em 20/02/2026, registram 14% de base, 6% adicionais quando habilitado o programa de frete grátis, parcela fixa de R$ 4 e adicional CPF de R$ 3 acima de 450 pedidos em 90 dias. Os JSONs usam tetos agregados de R$ 104 e R$ 107, conforme o cenário.

Esses são dados do modelo histórico do repositório, **não uma revalidação atual de cada regra antiga**. Não confundir um teto agregado do modelo legado com teto percentual ou com a política atual sem teto geral. As URLs antigas hoje exibem conteúdo atualizado; não servem, sozinhas, para provar o texto de fevereiro.

O serviço atual rejeita `effectiveDate` anterior a 01/03/2026. As páginas HTML históricas foram removidas do site. Os serviços legados usados nos testes de contrato foram preservados em `references/shopee/2026-02-28/services/`, fora da publicação do site.

## 01/03/2026: comissão por faixas

Versão: `2026-03-01`. Intervalo selecionado pelo serviço: **01/03/2026 a 22/04/2026**, inclusive.

| Faixa | Comissão base | Pix no modelo |
| --- | --- | --- |
| Até R$ 79,99 | 20% + R$ 4 | 0% |
| R$ 80 a R$ 99,99 | 14% + R$ 16 | 5% |
| R$ 100 a R$ 199,99 | 14% + R$ 20 | 5% |
| R$ 200 a R$ 499,99 | 14% + R$ 26 | 5% |
| A partir de R$ 500 | 14% + R$ 26 | 8%, sujeito à ressalva “até 8%” |

Adicional CPF: R$ 3 acima de 450 pedidos/90 dias. Item barato CNPJ: abaixo de R$ 8. Campanha histórica do modelo: 2,5%. CPF barato permanece com fórmula parcialmente não confirmada.

A [referência local de março](../references/shopee/2026-03-01/README.md) é útil para regressão, mas não equivale a um extrato real. O HTML bruto contém a aplicação SPA, não uma preservação integral do artigo renderizado. [Artigo oficial de referência](https://seller.shopee.com.br/edu/article/26839/Comissao-para-vendedores-CNPJ-e-CPF-em-2026).

## 23/04/2026: atualização da Campanha de Destaque

Versão: `2026-04-23`. Intervalo conhecido no serviço: **23/04/2026 a 30/09/2026**, inclusive. **Esta é a versão atual em 18/09/2026.**

| Parâmetro | Antes | Depois |
| --- | --- | --- |
| Campanha de Destaque | 2,5% | 3,5% |
| Faixas e parcelas fixas | Tabela de março | Mantidas |
| Limite de item barato CNPJ | R$ 8 | Mantido |

A mudança é de 1 ponto percentual, e não um aumento de 1% sobre a taxa anterior. Em exemplo sintético sem Pix nem cupom, produto de R$ 100 tem comissão base de R$ 34; com campanha, o total passa de R$ 36,50 para R$ 37,50 e o líquido de R$ 63,50 para R$ 62,50.

A fonte declara a mudança em 23/04/2026. Sua atualização editorial em 21/07/2026 não reinicia essa vigência. [Campanhas de Destaque](https://seller.shopee.com.br/edu/article/18712).

## 01/10/2026: mudança já anunciada

Versão: `2026-10-01`. Selecionada para datas **a partir de 01/10/2026**. Em 18/09/2026, ainda é futura.

| Parâmetro | Até 30/09/2026 | Desde 01/10/2026 |
| --- | --- | --- |
| Parcela fixa até R$ 79,99 | R$ 4 | R$ 4,50 |
| Limite de item barato CNPJ | R$ 8 | R$ 9 |
| Percentuais, demais parcelas fixas e condições Pix | Tabela anterior | Mantidos pelo anúncio |
| Campanha geral | 3,5% | Mantida no modelo; anúncio de comissão não altera a campanha |

Exemplo sintético, CNPJ sem Pix/campanha/cupom: item de R$ 50 passa de comissão de R$ 14 para R$ 14,50; líquido cai de R$ 36 para R$ 35,50. Para item de R$ 100, a comissão base permanece R$ 34.

Não extrapolar o aumento da parcela fixa para os pontos regressivos de CPF: essa fórmula não foi esclarecida. [Anúncio atualizado em 18/09/2026](https://seller.shopee.com.br/edu/article/26839/Comissao-para-vendedores-CNPJ-e-CPF-em-2026).

## Outras datas que não criam versões da comissão básica

| Data | Significado conhecido | O que não concluir |
| --- | --- | --- |
| 16/12/2025 | Mudança descrita na apresentação dos valores líquidos em Minha Renda | Não implica nova alíquota de comissão |
| 16/03/2026 | Cabeçalho do artigo Programa de Frete Grátis | Não prova início de cada benefício listado |
| 24/04/2026 | Cabeçalho da política de logística do vendedor | Não comprova início da coparticipação de 25% nessa data |
| 13/07/2026 | Atualização indicada no artigo Afiliados do Vendedor | Não substitui a taxa de Campanha de Destaque |
| 21/07/2026 | Atualização do artigo de campanhas | Não muda o início documentado de 3,5% em abril |

As fontes correspondentes estão no [catálogo de fontes](shopee-policies.md#fontes-e-datas-das-páginas). Logística, afiliados e demais custos não têm versionamento histórico automático no serviço atual.

## Correspondência com o código

| Responsabilidade | Arquivo |
| --- | --- |
| Regras e cortes de vigência | [default-rules.ts](../src/domain/default-rules.ts) |
| Aplicação das regras e valores monetários | [commission.ts](../src/domain/commission.ts) |
| Seleção da data e metadados de auditoria | [commission-service.ts](../src/services/commission-service.ts) |
| Testes de datas, fuso e limites | [policy-versions.test.ts](../tests/policy-versions.test.ts) |
| Fixtures locais de março | [referência de março](../references/shopee/2026-03-01/README.md) |

`defaultCommissionRules2026` é a base histórica de março, **não a política atual por si só**. Para selecionar a regra correta, usar `getCommissionRules(effectiveDate)` ou o serviço com `rulesConfig.effectiveDate`.

Datas da API usam ISO (`YYYY-MM-DD`), embora a documentação humana use `DD/MM/YYYY`. A omissão da data usa o dia corrente de São Paulo. Uma instância do serviço mantém a data escolhida na construção; uma tela aberta mantém a data capturada ao carregar. A virada de dia exige nova instância/recarregamento para atualizar o padrão. Não há consulta automática às fontes oficiais.

## Procedimento para uma nova mudança

1. Abrir o artigo oficial renderizado e ler também tabelas em imagem; registrar URL, data de consulta e atualização apresentada.
2. Identificar a vigência explícita, o perfil afetado e quais regras permanecem iguais. Se o evento de corte de pedidos não estiver claro, registrá-lo como pendência.
3. Acrescentar o período ao histórico. Não sobrescrever a descrição de períodos antigos nem usar data editorial como vigência presumida.
4. Atualizar a política comercial e o contrato do serviço quando necessário. Classificar exemplos como oficiais ou sintéticos.
5. Alterar o seletor de regras e testar o dia anterior, o dia da mudança, o fuso, os limites monetários e CPF com 450/451 pedidos.
6. Conciliar exemplos autorizados em memória. Não persistir dados de clientes ou da operação; usar fixtures públicas ou sintéticas no repositório.
7. Informar a data da última verificação e as incertezas restantes. Publicação/deploy depende de solicitação explícita do usuário.

Até surgir uma nova regra cadastrada, o seletor continua aplicando a última versão disponível a datas posteriores. Isso é comportamento do software, não garantia de que a Shopee permanecerá com a mesma política.
