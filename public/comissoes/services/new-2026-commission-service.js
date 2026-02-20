function clampNonNegative(value) {
  return value < 0 ? 0 : value;
}

function findBracket(price) {
  if (price <= 79.99) return { name: 'Até R$79,99', percentageRate: 0.2, fixedFee: 4, pixSubsidyRate: 0 };
  if (price <= 99.99) return { name: 'R$80 a R$99,99', percentageRate: 0.14, fixedFee: 16, pixSubsidyRate: 0.05 };
  if (price <= 199.99) return { name: 'R$100 a R$199,99', percentageRate: 0.14, fixedFee: 20, pixSubsidyRate: 0.05 };
  if (price <= 499.99) return { name: 'R$200 a R$499,99', percentageRate: 0.14, fixedFee: 26, pixSubsidyRate: 0.05 };
  return { name: 'Acima de R$500', percentageRate: 0.14, fixedFee: 26, pixSubsidyRate: 0.08 };
}

function interpolate(price, minX, minY, maxX, maxY) {
  if (price <= minX) return minY;
  if (price >= maxX) return maxY;

  const ratio = (price - minX) / (maxX - minX);
  return minY + ratio * (maxY - minY);
}

function resolveFixedFee({ itemPrice, sellerType, ordersLast90Days, applyLowPriceRule }, bracket) {
  const isCpf = sellerType === 'cpf';
  const cpfExtraEnabled = isCpf && ordersLast90Days > 450;

  if (!isCpf && applyLowPriceRule && itemPrice < 8) {
    return {
      itemFixedFee: itemPrice / 2,
      cpfExtraFee: 0,
      lowPriceRuleLabel: 'CNPJ abaixo de R$8: adicional = metade do preço',
    };
  }

  if (isCpf && itemPrice < 12) {
    if (cpfExtraEnabled) {
      return {
        itemFixedFee: interpolate(itemPrice, 8, 6, 12, 7),
        cpfExtraFee: 0,
        lowPriceRuleLabel: 'CPF acima de 450 pedidos: taxa regressiva abaixo de R$12',
      };
    }

    return {
      itemFixedFee: interpolate(itemPrice, 8, 3, 12, 4),
      cpfExtraFee: 0,
      lowPriceRuleLabel: 'CPF até 450 pedidos: taxa regressiva abaixo de R$12',
    };
  }

  return {
    itemFixedFee: bracket.fixedFee,
    cpfExtraFee: cpfExtraEnabled ? 3 : 0,
    lowPriceRuleLabel: 'Sem regra regressiva aplicada',
  };
}

export function calculateNew2026Commission({
  itemPrice,
  sellerType,
  paymentMethod,
  ordersLast90Days,
  includeCampaignExtra,
  applyLowPriceRule,
}) {
  const bracket = findBracket(itemPrice);
  const percentageAmount = itemPrice * bracket.percentageRate;

  const fixedFeeResult = resolveFixedFee({ itemPrice, sellerType, ordersLast90Days, applyLowPriceRule }, bracket);
  const baseCommission = percentageAmount + fixedFeeResult.itemFixedFee + fixedFeeResult.cpfExtraFee;

  const pixSubsidyAmount = paymentMethod === 'pix' ? itemPrice * bracket.pixSubsidyRate : 0;
  const commissionAfterPix = clampNonNegative(baseCommission - pixSubsidyAmount);

  const itemInvoicePrice = clampNonNegative(itemPrice - pixSubsidyAmount);
  const campaignAmount = includeCampaignExtra ? itemInvoicePrice * 0.025 : 0;
  const totalCommission = commissionAfterPix + campaignAmount;

  return {
    bracketName: bracket.name,
    percentageRate: bracket.percentageRate,
    percentageAmount,
    itemFixedFee: fixedFeeResult.itemFixedFee,
    cpfExtraFee: fixedFeeResult.cpfExtraFee,
    baseCommission,
    pixSubsidyRate: paymentMethod === 'pix' ? bracket.pixSubsidyRate : 0,
    pixSubsidyAmount,
    campaignAmount,
    totalCommission,
    netAmount: itemInvoicePrice - totalCommission,
    scopeLabel: 'Política nova (a partir de 01/03/2026)',
    lowPriceRuleLabel: fixedFeeResult.lowPriceRuleLabel,
  };
}
