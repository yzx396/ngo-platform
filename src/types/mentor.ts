// Bit flag enums
export enum MentoringLevel {
  Entry = 1,       // 0001 (2^0)
  Senior = 2,      // 0010 (2^1)
  Staff = 4,       // 0100 (2^2)
  Management = 8   // 1000 (2^3)
}

export enum PaymentType {
  Venmo = 1,       // 000001 (2^0)
  Paypal = 2,      // 000010 (2^1)
  Zelle = 4,       // 000100 (2^2)
  Alipay = 8,      // 001000 (2^3)
  Wechat = 16,     // 010000 (2^4)
  Crypto = 32      // 100000 (2^5)
}

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

// Helper functions for bit flag manipulation
export function hasLevel(levels: number, level: MentoringLevel): boolean {
  return (levels & level) !== 0;
}

export function addLevel(levels: number, level: MentoringLevel): number {
  return levels | level;
}

export function removeLevel(levels: number, level: MentoringLevel): number {
  return levels & ~level;
}

export function toggleLevel(levels: number, level: MentoringLevel): number {
  return levels ^ level;
}

export function getLevelNames(levels: number): string[] {
  const names: string[] = [];
  if (levels & MentoringLevel.Entry) names.push('Entry');
  if (levels & MentoringLevel.Senior) names.push('Senior');
  if (levels & MentoringLevel.Staff) names.push('Staff');
  if (levels & MentoringLevel.Management) names.push('Management');
  return names;
}

export function hasPaymentType(types: number, type: PaymentType): boolean {
  return (types & type) !== 0;
}

export function addPaymentType(types: number, type: PaymentType): number {
  return types | type;
}

export function removePaymentType(types: number, type: PaymentType): number {
  return types & ~type;
}

export function togglePaymentType(types: number, type: PaymentType): number {
  return types ^ type;
}

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

// Convert array of level names to bit flags
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

// Convert array of payment type names to bit flags
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
