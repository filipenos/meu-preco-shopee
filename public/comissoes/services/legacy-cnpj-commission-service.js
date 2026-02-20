function clampNonNegative(value) {
  return value < 0 ? 0 : value;
}

export function calculateLegacyCnpjCommission({
  itemPrice,
  includeFreteGratis,
  includeCampaignExtra,
  applyLowPriceRule,
}) {
  const percentageRate = 0.14;
  const percentageAmount = itemPrice * percentageRate;
  const transporteAmount = includeFreteGratis ? itemPrice * 0.06 : 0;

  let itemFixedFee = 4;
  if (applyLowPriceRule && itemPrice < 8) {
    itemFixedFee = itemPrice / 2;
  }

  const rawBaseCommission = percentageAmount + transporteAmount + itemFixedFee;
  const cappedBaseCommission = Math.min(rawBaseCommission, 104);

  const campaignAmount = includeCampaignExtra ? itemPrice * 0.025 : 0;
  const totalCommission = clampNonNegative(cappedBaseCommission + campaignAmount);

  return {
    percentageRate,
    percentageAmount,
    itemFixedFee,
    cpfExtraFee: 0,
    baseCommission: cappedBaseCommission,
    baseCap: 104,
    campaignAmount,
    totalCommission,
    netAmount: itemPrice - totalCommission,
    transporteAmount,
    scopeLabel: 'CNPJ (artigo 18483)',
  };
}
