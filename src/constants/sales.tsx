// Sale end date (New Year's 2025)
export const SALE_END_DATE = new Date('2025-01-01T00:00:00').getTime();

// Current sale configuration
export const CURRENT_SALE = {
  isActive: false,
  discountPercent: 40,
  monthsDuration: 3,
  get discountMultiplier() {
    return 1 - (this.discountPercent / 100);
  },
  name: 'Holiday Sale'
}; 
