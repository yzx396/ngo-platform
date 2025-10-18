/**
 * Mentor profile types and bit flag utilities
 * Uses bit flags for efficient storage and querying of mentoring levels and payment types
 */

/**
 * Bit flag enums for mentoring levels
 * Each level is a power of 2, allowing efficient bitwise operations
 */
export enum MentoringLevel {
  Entry = 1,       // 0001 (2^0)
  Senior = 2,      // 0010 (2^1)
  Staff = 4,       // 0100 (2^2)
  Management = 8   // 1000 (2^3)
}

/**
 * Bit flag enums for payment types
 * Each type is a power of 2, allowing efficient bitwise operations
 */
export enum PaymentType {
  Venmo = 1,       // 000001 (2^0)
  Paypal = 2,      // 000010 (2^1)
  Zelle = 4,       // 000100 (2^2)
  Alipay = 8,      // 001000 (2^3)
  Wechat = 16,     // 010000 (2^4)
  Crypto = 32      // 100000 (2^5)
}

/**
 * Mentor profile interface
 * Stores mentor information with bit flags for levels and payment types
 */
export interface MentorProfile {
  id: string;
  user_id: string;
  nick_name: string;
  bio: string;
  mentoring_levels: number; // Bit flags
  availability: string | null; // Free text description
  hourly_rate: number | null;
  payment_types: number; // Bit flags
  allow_reviews: boolean;
  allow_recording: boolean;
  created_at: number;
  updated_at: number;
}

// ============================================================================
// Mentoring Level Helper Functions
// ============================================================================

/**
 * Check if a mentoring level is set in the bit flags
 * @param levels - The bit flags representing mentoring levels
 * @param level - The level to check
 * @returns true if the level is set, false otherwise
 */
export function hasLevel(levels: number, level: MentoringLevel): boolean {
  return (levels & level) !== 0;
}

/**
 * Add a mentoring level to the bit flags
 * @param levels - The current bit flags
 * @param level - The level to add
 * @returns The updated bit flags
 */
export function addLevel(levels: number, level: MentoringLevel): number {
  return levels | level;
}

/**
 * Remove a mentoring level from the bit flags
 * @param levels - The current bit flags
 * @param level - The level to remove
 * @returns The updated bit flags
 */
export function removeLevel(levels: number, level: MentoringLevel): number {
  return levels & ~level;
}

/**
 * Toggle a mentoring level in the bit flags
 * @param levels - The current bit flags
 * @param level - The level to toggle
 * @returns The updated bit flags
 */
export function toggleLevel(levels: number, level: MentoringLevel): number {
  return levels ^ level;
}

/**
 * Get the names of all set mentoring levels
 * @param levels - The bit flags representing mentoring levels
 * @returns Array of level names (e.g., ['Entry', 'Senior'])
 */
export function getLevelNames(levels: number): string[] {
  const names: string[] = [];
  if (levels & MentoringLevel.Entry) names.push('Entry');
  if (levels & MentoringLevel.Senior) names.push('Senior');
  if (levels & MentoringLevel.Staff) names.push('Staff');
  if (levels & MentoringLevel.Management) names.push('Management');
  return names;
}

// ============================================================================
// Payment Type Helper Functions
// ============================================================================

/**
 * Check if a payment type is set in the bit flags
 * @param types - The bit flags representing payment types
 * @param type - The payment type to check
 * @returns true if the type is set, false otherwise
 */
export function hasPaymentType(types: number, type: PaymentType): boolean {
  return (types & type) !== 0;
}

/**
 * Add a payment type to the bit flags
 * @param types - The current bit flags
 * @param type - The payment type to add
 * @returns The updated bit flags
 */
export function addPaymentType(types: number, type: PaymentType): number {
  return types | type;
}

/**
 * Remove a payment type from the bit flags
 * @param types - The current bit flags
 * @param type - The payment type to remove
 * @returns The updated bit flags
 */
export function removePaymentType(types: number, type: PaymentType): number {
  return types & ~type;
}

/**
 * Toggle a payment type in the bit flags
 * @param types - The current bit flags
 * @param type - The payment type to toggle
 * @returns The updated bit flags
 */
export function togglePaymentType(types: number, type: PaymentType): number {
  return types ^ type;
}

/**
 * Get the names of all set payment types
 * @param types - The bit flags representing payment types
 * @returns Array of payment type names (e.g., ['Venmo', 'Paypal'])
 */
export function getPaymentTypeNames(types: number): string[] {
  const names: string[] = [];
  if (types & PaymentType.Venmo) names.push('Venmo');
  if (types & PaymentType.Paypal) names.push('Paypal');
  if (types & PaymentType.Zelle) names.push('Zelle');
  if (types & PaymentType.Alipay) names.push('Alipay');
  if (types & PaymentType.Wechat) names.push('WeChat');
  if (types & PaymentType.Crypto) names.push('Crypto');
  return names;
}

// ============================================================================
// Conversion Functions (String Array ↔ Bit Flags)
// ============================================================================

/**
 * Convert an array of level names to bit flags
 * @param names - Array of level names (case-insensitive)
 * @returns The combined bit flags
 */
export function levelsFromNames(names: string[]): number {
  let levels = 0;
  for (const name of names) {
    switch (name.toLowerCase()) {
      case 'entry': levels |= MentoringLevel.Entry; break;
      case 'senior': levels |= MentoringLevel.Senior; break;
      case 'staff': levels |= MentoringLevel.Staff; break;
      case 'management': levels |= MentoringLevel.Management; break;
    }
  }
  return levels;
}

/**
 * Convert an array of payment type names to bit flags
 * @param names - Array of payment type names (case-insensitive)
 * @returns The combined bit flags
 */
export function paymentTypesFromNames(names: string[]): number {
  let types = 0;
  for (const name of names) {
    switch (name.toLowerCase()) {
      case 'venmo': types |= PaymentType.Venmo; break;
      case 'paypal': types |= PaymentType.Paypal; break;
      case 'zelle': types |= PaymentType.Zelle; break;
      case 'alipay': types |= PaymentType.Alipay; break;
      case 'wechat': types |= PaymentType.Wechat; break;
      case 'crypto': types |= PaymentType.Crypto; break;
    }
  }
  return types;
}
