# Meu Preço Shopee

Simulador de comissão Shopee 2026 para vendedores CPF e CNPJ, com cálculo por faixa, subsídio Pix e cenários de preço/líquido.

Referência oficial (Shopee):
- https://seller.shopee.com.br/edu/article/26839/Comissao-para-vendedores-CNPJ-e-CPF-em-2026

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

- Documentação interna do helper CLI atual: `scripts/README.md`

## Casos de uso

1. Informo o valor do produto
- Entrada: valor do item + configurações.
- Saída: comissão detalhada, subsídio Pix, valor líquido.

2. Informo quanto quero receber
- Entrada: valor líquido alvo + configurações.
- Saída: preço sugerido para atingir o líquido desejado.

## Regras principais de comissão (01/03/2026)

### CNPJ

| Faixa do item | Comissão | Subsídio Pix |
| --- | --- | --- |
| Até R$79,99 | 20% + R$4 | - |
| R$80 a R$99,99 | 14% + R$16 | 5% |
| R$100 a R$199,99 | 14% + R$20 | 5% |
| R$200 a R$499,99 | 14% + R$26 | 5% |
| Acima de R$500 | 14% + R$26 | 8% |

### CPF

- Mesmas faixas e percentuais do CNPJ.
- Para CPF acima de 450 pedidos em 90 dias, soma adicional de R$3 por item.
- Para CPF com até 450 pedidos em 90 dias, não aplica adicional de R$3.

## Configurações principais

- Campanha de Destaque Shopee (%): adicional aplicado somente quando a opção está ativa.
- Adicional CPF (R$): taxa extra por item para CPF acima do limite de pedidos em 90 dias.
- Limite pedidos CPF (90 dias): acima desse valor, aplica adicional CPF.
- Limite item barato CNPJ (R$): abaixo desse valor, taxa fixa vira metade do preço do item.
- Limite item barato CPF (R$): abaixo desse valor, aplica taxa regressiva de item.

## Regras extras (documentação)

### Operação e cobrança

- CNPJ com item abaixo de R$8 usa taxa fixa de metade do preço do item.
- CPF com item abaixo de R$12 usa taxa regressiva de item.
- Não há comissão em cancelamento, devolução, reembolso ou desistência da compra.
- Campanha de Destaque Shopee adiciona 2,5% durante campanha ativa.
- Subsídio Pix não é repasse extra ao vendedor; é regra de precificação/comissão no fluxo Pix.
- Atualização com vigência em 01/03/2026.

### CPF e documentação

- Com mais de 450 pedidos em 90 dias, adiciona R$3 por item (CPF).
- Com até 450 pedidos em 90 dias, não adiciona os R$3 (CPF).
- Vendedor com faturamento anual igual ou superior a R$81 mil deve emitir nota fiscal e operar com CNPJ.
- Ao migrar de CPF para CNPJ, o adicional de CPF deixa de ser aplicado em até 7 dias úteis.

### Frete e logística

- Programa de Frete Grátis sem coparticipação para todos os vendedores.
- Subsídio de frete:
  - Até R$20 para itens de até R$79,99.
  - Até R$30 para itens de R$80 a R$199,99.
  - Até R$40 para itens acima de R$200.
- Também há cupons de 50% de desconto no frete para compras acima de R$10.
- Para vendedores com Intelipost/API de frete, há política logística específica a partir de março/2026.

## Observações

- A interface permite ajustar parâmetros para simulações, mas o padrão inicial segue a política oficial publicada em 06/02/2026.
- Para valores de item muito baixos, o projeto aplica as regras especiais de item barato conforme tipo de vendedor.
