export const productConstraints = {
  nameMinLength: 2,
  nameMaxLength: 100,
  descriptionMaxLength: 1000,
  priceMin: 0.01,
  priceMax: 5_000_000,
  stockMin: 0,
  stockMax: 1_000_000,
} as const
