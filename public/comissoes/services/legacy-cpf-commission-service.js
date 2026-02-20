function clampNonNegative(value) {
  return value < 0 ? 0 : value;
}

function interpolate(price, minX, minY, maxX, maxY) {
  if (price <= minX) {
    return minY;
  }

  if (price >= maxX) {
    return maxY;
  }

  const ratio = (price - minX) / (maxX - minX);
  return minY + ratio * (maxY - minY);
}

function resolveCpfFixedFee(itemPrice, ordersLast90Days) {
  const hasCpfExtraFee = ordersLast90Days > 450;

  if (!hasCpfExtraFee) {
    return {
      itemFixedFee: 4,
      cpfExtraFee: 0,
      hasCpfExtraFee,
      lowPriceRegressionApplied: false,
    };
  }

  if (itemPrice < 12) {
    return {
      itemFixedFee: interpolate(itemPrice, 8, 6, 12, 7),
      cpfExtraFee: 0,
      hasCpfExtraFee,
      lowPriceRegressionApplied: true,
    };
  }

  return {
    itemFixedFee: 4,
    cpfExtraFee: 3,
    hasCpfExtraFee,
    lowPriceRegressionApplied: false,
  };
}

export function calculateLegacyCpfCommission({
  itemPrice,
  ordersLast90Days,
  includeFreteGratis,
  includeCampaignExtra,
}) {
  const percentageRate = 0.14;
  const percentageAmount = itemPrice * percentageRate;
  const transporteAmount = includeFreteGratis ? itemPrice * 0.06 : 0;

  const fixedFeeResult = resolveCpfFixedFee(itemPrice, ordersLast90Days);
  const rawBaseCommission =
    percentageAmount + transporteAmount + fixedFeeResult.itemFixedFee + fixedFeeResult.cpfExtraFee;
  const baseCap = fixedFeeResult.hasCpfExtraFee ? 107 : 104;
  const cappedBaseCommission = Math.min(rawBaseCommission, baseCap);

  const campaignAmount = includeCampaignExtra ? itemPrice * 0.025 : 0;
  const totalCommission = clampNonNegative(cappedBaseCommission + campaignAmount);

  return {
    percentageRate,
    percentageAmount,
    itemFixedFee: fixedFeeResult.itemFixedFee,
    cpfExtraFee: fixedFeeResult.cpfExtraFee,
    hasCpfExtraFee: fixedFeeResult.hasCpfExtraFee,
    lowPriceRegressionApplied: fixedFeeResult.lowPriceRegressionApplied,
    baseCommission: cappedBaseCommission,
    baseCap,
    campaignAmount,
    totalCommission,
    netAmount: itemPrice - totalCommission,
    transporteAmount,
    scopeLabel: 'CPF (artigo 18484)',
  };
}
