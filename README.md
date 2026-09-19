# Meu Preço Shopee

Simulador de comissão Shopee 2026 para vendedores CPF e CNPJ, com políticas por data, cálculo em centavos, subsídio Pix e cenários de preço/líquido.

**Status:** regras públicas revisadas em 18/09/2026. Arredondamentos e cenários não documentados ainda não foram conciliados com extratos reais. Não há garantia de correspondência integral com a Shopee. Consulte a [documentação do serviço](docs/calculation-service.md) para entradas, limites e pendências.

## Documentação

| Documento | Conteúdo |
| --- | --- |
| [Políticas comerciais](docs/shopee-policies.md) | Tabela atual, CPF/CNPJ, Pix, campanhas, cupons, frete, exceções e fontes oficiais |
| [Histórico das políticas](docs/shopee-policy-history.md) | Vigências, alterações, regra atual, anúncio de outubro e procedimento de atualização |
| [Serviço de cálculo](docs/calculation-service.md) | Entradas, unidades, arredondamento, API, auditoria e conciliação |
| [Helpers CLI](scripts/README.md) | Formatos JSON e comandos de execução |

## Política atual e mudança anunciada

**Referência: 18/09/2026.** “Atual” nesta documentação é relativo a essa data.

| Período | Fixo da primeira faixa | Limite de item barato CNPJ | Campanha geral |
| --- | --- | --- | --- |
| 01/03/2026 a 22/04/2026 | R$ 4,00 | R$ 8,00 | 2,5% |
| **23/04/2026 a 30/09/2026 — atual** | **R$ 4,00** | **R$ 8,00** | **3,5%** |
| 01/10/2026 em diante — anunciado | R$ 4,50 | R$ 9,00 | 3,5% |

A primeira faixa vai até R$ 79,99; as demais parcelas fixas permanecem R$ 16, R$ 20 e R$ 26. A regra especial de item barato usa metade do preço como parcela fixa. Campanha se aplica somente durante a participação da loja, e campanhas especiais podem ter outra taxa. Veja os [detalhes e ressalvas](docs/shopee-policies.md).

Fontes principais: [política CNPJ/CPF](https://seller.shopee.com.br/edu/article/26839/Comissao-para-vendedores-CNPJ-e-CPF-em-2026) e [Campanhas de Destaque](https://seller.shopee.com.br/edu/article/18712).

## Stack

- Vue 3 + TypeScript (Vite)
- Tailwind CSS
- Vitest

## Como rodar

```bash
npm install
npm run dev
```

## Testes

```bash
npm test
```

## Scripts auxiliares

- Helpers disponíveis:
- `npm run helper:net-from-full-price -- --input ./scripts/test-data/dados.json`
- `npm run helper:discount-from-net -- --input ./scripts/test-data/dados.json`
- `npm run helper:full-price-from-net -- --input ./scripts/test-data/dados.json`
- Documentação completa (formato do JSON, parâmetros e saída): `scripts/README.md`

## Interface e serviços

O site tem uma única página: a calculadora de comissão e valor líquido recebido, a partir do preço do produto e das configurações da venda. Endereços de páginas removidas redirecionam para `/` quando atendidos pelo aplicativo.

Os serviços e helpers de preço inverso, desconto, custo/lucro e pedidos continuam disponíveis para uso programático, conforme a [documentação do serviço](docs/calculation-service.md).

## Referências históricas

- [Pacote até 28/02/2026](references/shopee/2026-02-28/README.md): modelo legado, fora do seletor atual de políticas.
- [Pacote de 01/03/2026](references/shopee/2026-03-01/README.md): regras e cenários locais de regressão, com limitações documentadas.

As referências locais não comprovam todas as regras oficiais nem a igualdade centavo a centavo. O [histórico](docs/shopee-policy-history.md) explica a diferença entre regra publicada, registro local e convenção do simulador.
