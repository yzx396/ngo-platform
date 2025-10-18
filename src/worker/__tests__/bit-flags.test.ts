/**
 * Tests for bit flag helper functions
 * Following TDD approach: comprehensive coverage for all bit operations
 */

import { describe, it, expect } from 'vitest';
import {
  MentoringLevel,
  PaymentType,
  hasLevel,
  addLevel,
  removeLevel,
  toggleLevel,
  getLevelNames,
  hasPaymentType,
  addPaymentType,
  removePaymentType,
  togglePaymentType,
  getPaymentTypeNames,
  levelsFromNames,
  paymentTypesFromNames,
} from '../../types/mentor';

// ============================================================================
// Mentoring Level Tests
// ============================================================================

describe('Mentoring Level Helper Functions', () => {
  describe('hasLevel', () => {
    it('should return true when level is set', () => {
      const levels = MentoringLevel.Entry | MentoringLevel.Senior; // 3 (0011)
      expect(hasLevel(levels, MentoringLevel.Entry)).toBe(true);
      expect(hasLevel(levels, MentoringLevel.Senior)).toBe(true);
    });

    it('should return false when level is not set', () => {
      const levels = MentoringLevel.Entry | MentoringLevel.Senior; // 3 (0011)
      expect(hasLevel(levels, MentoringLevel.Staff)).toBe(false);
      expect(hasLevel(levels, MentoringLevel.Management)).toBe(false);
    });

    it('should return false when levels is 0', () => {
      expect(hasLevel(0, MentoringLevel.Entry)).toBe(false);
      expect(hasLevel(0, MentoringLevel.Senior)).toBe(false);
    });

    it('should handle all levels set', () => {
      const allLevels = MentoringLevel.Entry | MentoringLevel.Senior |
                        MentoringLevel.Staff | MentoringLevel.Management; // 15 (1111)
      expect(hasLevel(allLevels, MentoringLevel.Entry)).toBe(true);
      expect(hasLevel(allLevels, MentoringLevel.Senior)).toBe(true);
      expect(hasLevel(allLevels, MentoringLevel.Staff)).toBe(true);
      expect(hasLevel(allLevels, MentoringLevel.Management)).toBe(true);
    });
  });

  describe('addLevel', () => {
    it('should add a level to empty flags', () => {
      expect(addLevel(0, MentoringLevel.Entry)).toBe(1);
      expect(addLevel(0, MentoringLevel.Senior)).toBe(2);
    });

    it('should add a level to existing flags', () => {
      const initial = MentoringLevel.Entry; // 1
      expect(addLevel(initial, MentoringLevel.Senior)).toBe(3); // 1 | 2 = 3
    });

    it('should be idempotent (adding same level twice has no effect)', () => {
      const initial = MentoringLevel.Entry; // 1
      const once = addLevel(initial, MentoringLevel.Entry); // 1
      const twice = addLevel(once, MentoringLevel.Entry); // 1
      expect(once).toBe(twice);
      expect(once).toBe(1);
    });

    it('should combine multiple levels correctly', () => {
      let levels = 0;
      levels = addLevel(levels, MentoringLevel.Entry); // 1
      levels = addLevel(levels, MentoringLevel.Senior); // 3
      levels = addLevel(levels, MentoringLevel.Staff); // 7
      levels = addLevel(levels, MentoringLevel.Management); // 15
      expect(levels).toBe(15);
    });
  });

  describe('removeLevel', () => {
    it('should remove a level from flags', () => {
      const levels = MentoringLevel.Entry | MentoringLevel.Senior; // 3
      expect(removeLevel(levels, MentoringLevel.Entry)).toBe(2); // Only Senior remains
    });

    it('should not affect other levels', () => {
      const levels = MentoringLevel.Entry | MentoringLevel.Senior | MentoringLevel.Staff; // 7
      const result = removeLevel(levels, MentoringLevel.Senior);
      expect(hasLevel(result, MentoringLevel.Entry)).toBe(true);
      expect(hasLevel(result, MentoringLevel.Senior)).toBe(false);
      expect(hasLevel(result, MentoringLevel.Staff)).toBe(true);
    });

    it('should handle removing non-existent level (no-op)', () => {
      const levels = MentoringLevel.Entry; // 1
      expect(removeLevel(levels, MentoringLevel.Senior)).toBe(1); // No change
    });

    it('should result in 0 when removing the last level', () => {
      const levels = MentoringLevel.Entry; // 1
      expect(removeLevel(levels, MentoringLevel.Entry)).toBe(0);
    });
  });

  describe('toggleLevel', () => {
    it('should add level when not set', () => {
      const levels = 0;
      expect(toggleLevel(levels, MentoringLevel.Entry)).toBe(1);
    });

    it('should remove level when already set', () => {
      const levels = MentoringLevel.Entry; // 1
      expect(toggleLevel(levels, MentoringLevel.Entry)).toBe(0);
    });

    it('should toggle back and forth', () => {
      let levels = 0;
      levels = toggleLevel(levels, MentoringLevel.Senior); // Add: 2
      expect(levels).toBe(2);
      levels = toggleLevel(levels, MentoringLevel.Senior); // Remove: 0
      expect(levels).toBe(0);
      levels = toggleLevel(levels, MentoringLevel.Senior); // Add: 2
      expect(levels).toBe(2);
    });

    it('should not affect other levels when toggling', () => {
      const levels = MentoringLevel.Entry | MentoringLevel.Staff; // 5
      const toggled = toggleLevel(levels, MentoringLevel.Senior); // Add Senior: 7
      expect(hasLevel(toggled, MentoringLevel.Entry)).toBe(true);
      expect(hasLevel(toggled, MentoringLevel.Senior)).toBe(true);
      expect(hasLevel(toggled, MentoringLevel.Staff)).toBe(true);
    });
  });

  describe('getLevelNames', () => {
    it('should return empty array for no levels', () => {
      expect(getLevelNames(0)).toEqual([]);
    });

    it('should return single level name', () => {
      expect(getLevelNames(MentoringLevel.Entry)).toEqual(['Entry']);
      expect(getLevelNames(MentoringLevel.Senior)).toEqual(['Senior']);
    });

    it('should return multiple level names in order', () => {
      const levels = MentoringLevel.Entry | MentoringLevel.Senior; // 3
      expect(getLevelNames(levels)).toEqual(['Entry', 'Senior']);
    });

    it('should return all level names when all are set', () => {
      const allLevels = MentoringLevel.Entry | MentoringLevel.Senior |
                        MentoringLevel.Staff | MentoringLevel.Management; // 15
      expect(getLevelNames(allLevels)).toEqual(['Entry', 'Senior', 'Staff', 'Management']);
    });

    it('should return names for non-contiguous levels', () => {
      const levels = MentoringLevel.Entry | MentoringLevel.Staff; // 5 (0101)
      expect(getLevelNames(levels)).toEqual(['Entry', 'Staff']);
    });
  });

  describe('levelsFromNames', () => {
    it('should return 0 for empty array', () => {
      expect(levelsFromNames([])).toBe(0);
    });

    it('should convert single level name', () => {
      expect(levelsFromNames(['entry'])).toBe(MentoringLevel.Entry);
      expect(levelsFromNames(['senior'])).toBe(MentoringLevel.Senior);
    });

    it('should be case-insensitive', () => {
      expect(levelsFromNames(['ENTRY'])).toBe(MentoringLevel.Entry);
      expect(levelsFromNames(['Entry'])).toBe(MentoringLevel.Entry);
      expect(levelsFromNames(['eNtRy'])).toBe(MentoringLevel.Entry);
    });

    it('should combine multiple level names', () => {
      expect(levelsFromNames(['entry', 'senior'])).toBe(3); // 1 | 2
      expect(levelsFromNames(['staff', 'management'])).toBe(12); // 4 | 8
    });

    it('should handle all level names', () => {
      const names = ['entry', 'senior', 'staff', 'management'];
      expect(levelsFromNames(names)).toBe(15); // All flags set
    });

    it('should ignore invalid level names', () => {
      expect(levelsFromNames(['entry', 'invalid', 'senior'])).toBe(3);
    });

    it('should handle duplicate names (idempotent)', () => {
      expect(levelsFromNames(['entry', 'entry'])).toBe(MentoringLevel.Entry);
    });
  });
});

// ============================================================================
// Payment Type Tests
// ============================================================================

describe('Payment Type Helper Functions', () => {
  describe('hasPaymentType', () => {
    it('should return true when payment type is set', () => {
      const types = PaymentType.Venmo | PaymentType.Paypal; // 3
      expect(hasPaymentType(types, PaymentType.Venmo)).toBe(true);
      expect(hasPaymentType(types, PaymentType.Paypal)).toBe(true);
    });

    it('should return false when payment type is not set', () => {
      const types = PaymentType.Venmo | PaymentType.Paypal; // 3
      expect(hasPaymentType(types, PaymentType.Zelle)).toBe(false);
      expect(hasPaymentType(types, PaymentType.Crypto)).toBe(false);
    });

    it('should return false when types is 0', () => {
      expect(hasPaymentType(0, PaymentType.Venmo)).toBe(false);
    });

    it('should handle all payment types set', () => {
      const allTypes = PaymentType.Venmo | PaymentType.Paypal | PaymentType.Zelle |
                       PaymentType.Alipay | PaymentType.Wechat | PaymentType.Crypto; // 63
      expect(hasPaymentType(allTypes, PaymentType.Venmo)).toBe(true);
      expect(hasPaymentType(allTypes, PaymentType.Crypto)).toBe(true);
    });
  });

  describe('addPaymentType', () => {
    it('should add a payment type to empty flags', () => {
      expect(addPaymentType(0, PaymentType.Venmo)).toBe(1);
      expect(addPaymentType(0, PaymentType.Crypto)).toBe(32);
    });

    it('should add a payment type to existing flags', () => {
      const initial = PaymentType.Venmo; // 1
      expect(addPaymentType(initial, PaymentType.Paypal)).toBe(3); // 1 | 2
    });

    it('should be idempotent', () => {
      const initial = PaymentType.Venmo;
      const once = addPaymentType(initial, PaymentType.Venmo);
      const twice = addPaymentType(once, PaymentType.Venmo);
      expect(once).toBe(twice);
    });

    it('should combine multiple payment types correctly', () => {
      let types = 0;
      types = addPaymentType(types, PaymentType.Venmo); // 1
      types = addPaymentType(types, PaymentType.Paypal); // 3
      types = addPaymentType(types, PaymentType.Crypto); // 35
      expect(types).toBe(35);
    });
  });

  describe('removePaymentType', () => {
    it('should remove a payment type from flags', () => {
      const types = PaymentType.Venmo | PaymentType.Paypal; // 3
      expect(removePaymentType(types, PaymentType.Venmo)).toBe(2);
    });

    it('should not affect other payment types', () => {
      const types = PaymentType.Venmo | PaymentType.Paypal | PaymentType.Zelle; // 7
      const result = removePaymentType(types, PaymentType.Paypal);
      expect(hasPaymentType(result, PaymentType.Venmo)).toBe(true);
      expect(hasPaymentType(result, PaymentType.Paypal)).toBe(false);
      expect(hasPaymentType(result, PaymentType.Zelle)).toBe(true);
    });

    it('should handle removing non-existent type (no-op)', () => {
      const types = PaymentType.Venmo;
      expect(removePaymentType(types, PaymentType.Crypto)).toBe(1);
    });
  });

  describe('togglePaymentType', () => {
    it('should add type when not set', () => {
      expect(togglePaymentType(0, PaymentType.Venmo)).toBe(1);
    });

    it('should remove type when already set', () => {
      const types = PaymentType.Venmo;
      expect(togglePaymentType(types, PaymentType.Venmo)).toBe(0);
    });

    it('should toggle back and forth', () => {
      let types = 0;
      types = togglePaymentType(types, PaymentType.Crypto);
      expect(types).toBe(32);
      types = togglePaymentType(types, PaymentType.Crypto);
      expect(types).toBe(0);
    });
  });

  describe('getPaymentTypeNames', () => {
    it('should return empty array for no types', () => {
      expect(getPaymentTypeNames(0)).toEqual([]);
    });

    it('should return single payment type name', () => {
      expect(getPaymentTypeNames(PaymentType.Venmo)).toEqual(['Venmo']);
      expect(getPaymentTypeNames(PaymentType.Crypto)).toEqual(['Crypto']);
    });

    it('should return multiple payment type names in order', () => {
      const types = PaymentType.Venmo | PaymentType.Paypal; // 3
      expect(getPaymentTypeNames(types)).toEqual(['Venmo', 'Paypal']);
    });

    it('should return all payment type names when all are set', () => {
      const allTypes = PaymentType.Venmo | PaymentType.Paypal | PaymentType.Zelle |
                       PaymentType.Alipay | PaymentType.Wechat | PaymentType.Crypto; // 63
      expect(getPaymentTypeNames(allTypes)).toEqual([
        'Venmo', 'Paypal', 'Zelle', 'Alipay', 'WeChat', 'Crypto'
      ]);
    });

    it('should return names for non-contiguous types', () => {
      const types = PaymentType.Venmo | PaymentType.Zelle | PaymentType.Crypto; // 37
      expect(getPaymentTypeNames(types)).toEqual(['Venmo', 'Zelle', 'Crypto']);
    });
  });

  describe('paymentTypesFromNames', () => {
    it('should return 0 for empty array', () => {
      expect(paymentTypesFromNames([])).toBe(0);
    });

    it('should convert single payment type name', () => {
      expect(paymentTypesFromNames(['venmo'])).toBe(PaymentType.Venmo);
      expect(paymentTypesFromNames(['crypto'])).toBe(PaymentType.Crypto);
    });

    it('should be case-insensitive', () => {
      expect(paymentTypesFromNames(['VENMO'])).toBe(PaymentType.Venmo);
      expect(paymentTypesFromNames(['Venmo'])).toBe(PaymentType.Venmo);
      expect(paymentTypesFromNames(['vEnMo'])).toBe(PaymentType.Venmo);
    });

    it('should combine multiple payment type names', () => {
      expect(paymentTypesFromNames(['venmo', 'paypal'])).toBe(3); // 1 | 2
      expect(paymentTypesFromNames(['alipay', 'wechat', 'crypto'])).toBe(56); // 8 | 16 | 32
    });

    it('should handle all payment type names', () => {
      const names = ['venmo', 'paypal', 'zelle', 'alipay', 'wechat', 'crypto'];
      expect(paymentTypesFromNames(names)).toBe(63); // All flags set
    });

    it('should ignore invalid payment type names', () => {
      expect(paymentTypesFromNames(['venmo', 'invalid', 'paypal'])).toBe(3);
    });

    it('should handle duplicate names (idempotent)', () => {
      expect(paymentTypesFromNames(['venmo', 'venmo'])).toBe(PaymentType.Venmo);
    });
  });
});

// ============================================================================
// Integration Tests (Real-world Scenarios)
// ============================================================================

describe('Bit Flag Integration Tests', () => {
  it('should handle mentor offering Entry and Senior levels', () => {
    let levels = 0;
    levels = addLevel(levels, MentoringLevel.Entry);
    levels = addLevel(levels, MentoringLevel.Senior);

    expect(getLevelNames(levels)).toEqual(['Entry', 'Senior']);
    expect(hasLevel(levels, MentoringLevel.Entry)).toBe(true);
    expect(hasLevel(levels, MentoringLevel.Senior)).toBe(true);
    expect(hasLevel(levels, MentoringLevel.Staff)).toBe(false);
  });

  it('should handle mentor accepting Venmo, Paypal, and Zelle', () => {
    const types = paymentTypesFromNames(['venmo', 'paypal', 'zelle']);

    expect(getPaymentTypeNames(types)).toEqual(['Venmo', 'Paypal', 'Zelle']);
    expect(hasPaymentType(types, PaymentType.Venmo)).toBe(true);
    expect(hasPaymentType(types, PaymentType.Crypto)).toBe(false);
  });

  it('should handle search query combining multiple levels', () => {
    // Mentor offers Entry and Senior
    const mentorLevels = levelsFromNames(['entry', 'senior']); // 3

    // Search for mentors offering Senior or Staff
    const searchLevels = levelsFromNames(['senior', 'staff']); // 6

    // Check if mentor matches search (bitwise AND should be > 0)
    const matches = (mentorLevels & searchLevels) > 0;
    expect(matches).toBe(true); // Matches because both have Senior
  });

  it('should handle updating mentor profile (removing one level)', () => {
    // Mentor initially offers all levels
    let levels = levelsFromNames(['entry', 'senior', 'staff', 'management']);
    expect(levels).toBe(15);

    // Mentor decides to stop offering Management level
    levels = removeLevel(levels, MentoringLevel.Management);
    expect(getLevelNames(levels)).toEqual(['Entry', 'Senior', 'Staff']);
  });

  it('should handle toggling payment types based on user checkbox interaction', () => {
    let types = paymentTypesFromNames(['venmo', 'paypal']);

    // User unchecks Venmo
    types = togglePaymentType(types, PaymentType.Venmo);
    expect(getPaymentTypeNames(types)).toEqual(['Paypal']);

    // User checks Crypto
    types = togglePaymentType(types, PaymentType.Crypto);
    expect(getPaymentTypeNames(types)).toEqual(['Paypal', 'Crypto']);

    // User checks Venmo again
    types = togglePaymentType(types, PaymentType.Venmo);
    expect(getPaymentTypeNames(types)).toEqual(['Venmo', 'Paypal', 'Crypto']);
  });

  it('should round-trip from names to flags and back', () => {
    const originalNames = ['entry', 'staff', 'management'];
    const flags = levelsFromNames(originalNames);
    const resultNames = getLevelNames(flags);

    expect(resultNames).toEqual(['Entry', 'Staff', 'Management']);
  });
});
