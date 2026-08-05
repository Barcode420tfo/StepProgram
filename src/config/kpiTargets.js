export const AUGUST_2026_INDIVIDUAL_TARGETS = Object.freeze({
  onboarding: 208,
  engagements: 130,
  devfin: 42,
  devfinValue: 5_250_000,
  devpro: 78,
  devproValue: 520_000,
  devfinDays: 21,
  devproDays: 26,
});

export const AUGUST_2026_CLUSTER_TARGETS = Object.freeze({
  'computer-village': { devfin: 70, devfinValue: 8_400_000, devpro: 78, devproValue: 1_250_000, sourceCluster: 'Computer Village' },
  lawanson: { devfin: 50, devfinValue: 6_000_000, devpro: 52, devproValue: 750_000, sourceCluster: 'Lawanson' },
  ikorodu: { devfin: 20, devfinValue: 2_400_000, devpro: 26, devproValue: 300_000, sourceCluster: 'Ikorodu' },
  'unilag-akoka': { devfin: 20, devfinValue: 2_400_000, devpro: 26, devproValue: 300_000, sourceCluster: 'Unilag/Akoka' },
  'abule-egba-sango': { devfin: 20, devfinValue: 2_400_000, devpro: 26, devproValue: 300_000, sourceCluster: 'Abule Egba-Sango Axis' },
  alaba: { devfin: 15, devfinValue: 1_800_000, devpro: 26, devproValue: 300_000, sourceCluster: 'Alaba' },
  'saka-tinubu': { devfin: 15, devfinValue: 1_800_000, devpro: 26, devproValue: 300_000, sourceCluster: 'Saka Tinubu' },
});

export function isAugust2026Range(range) {
  return range?.start?.getFullYear() === 2026 && range.start.getMonth() === 7 &&
    range?.end?.getFullYear() === 2026 && range.end.getMonth() === 7;
}
