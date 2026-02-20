import { calculateLegacyCnpjCommission } from './legacy-cnpj-commission-service.js';
import { calculateLegacyCpfCommission } from './legacy-cpf-commission-service.js';

export function calculateLegacyCommission({
  itemPrice,
  sellerType,
  ordersLast90Days,
  includeFreteGratis,
  includeCampaignExtra,
  applyLowPriceRule,
}) {
  if (sellerType === 'cpf') {
    return calculateLegacyCpfCommission({
      itemPrice,
      ordersLast90Days,
      includeFreteGratis,
      includeCampaignExtra,
    });
  }

  return calculateLegacyCnpjCommission({
    itemPrice,
    includeFreteGratis,
    includeCampaignExtra,
    applyLowPriceRule,
  });
}
