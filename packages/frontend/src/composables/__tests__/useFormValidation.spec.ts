import { validateField, commonRules } from '../useFormValidation'
import type { ValidationRule } from '../useFormValidation'

describe('useFormValidation', () => {
  // ------------------------------------------
  // validateField
  // ------------------------------------------
  describe('validateField', () => {
    describe('required rule', () => {
      const rules: ValidationRule[] = [{ required: true, message: '此欄位為必填' }]

      it('returns error message for null', () => {
        expect(validateField(null, rules)).toBe('此欄位為必填')
      })

      it('returns error message for undefined', () => {
        expect(validateField(undefined, rules)).toBe('此欄位為必填')
      })

      it('returns error message for empty string', () => {
        expect(validateField('', rules)).toBe('此欄位為必填')
      })

      it('returns null for non-empty string', () => {
        expect(validateField('hello', rules)).toBeNull()
      })

      it('returns null for a number value', () => {
        expect(validateField(42, rules)).toBeNull()
      })
    })

    describe('minLength rule', () => {
      const rules: ValidationRule[] = [{ minLength: 3, message: '至少需要 3 個字元' }]

      it('returns error when string is too short', () => {
        expect(validateField('ab', rules)).toBe('至少需要 3 個字元')
      })

      it('returns null when string meets minimum length', () => {
        expect(validateField('abc', rules)).toBeNull()
      })

      it('returns null when string exceeds minimum length', () => {
        expect(validateField('abcdef', rules)).toBeNull()
      })
    })

    describe('maxLength rule', () => {
      const rules: ValidationRule[] = [{ maxLength: 5, message: '不能超過 5 個字元' }]

      it('returns error when string exceeds max length', () => {
        expect(validateField('abcdef', rules)).toBe('不能超過 5 個字元')
      })

      it('returns null when string is within limit', () => {
        expect(validateField('abc', rules)).toBeNull()
      })

      it('returns null when string is exactly at max length', () => {
        expect(validateField('abcde', rules)).toBeNull()
      })
    })

    describe('pattern rule', () => {
      const emailRules: ValidationRule[] = [
        { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: '無效的電子郵件' },
      ]

      it('returns error for invalid email', () => {
        expect(validateField('not-an-email', emailRules)).toBe('無效的電子郵件')
      })

      it('returns error for email without domain', () => {
        expect(validateField('user@', emailRules)).toBe('無效的電子郵件')
      })

      it('returns null for valid email', () => {
        expect(validateField('user@example.com', emailRules)).toBeNull()
      })
    })

    describe('custom rule', () => {
      const rules: ValidationRule[] = [
        {
          custom: (value: unknown) => typeof value === 'number' && value > 0,
          message: '必須為正數',
        },
      ]

      it('returns error when custom validator fails', () => {
        expect(validateField(-1, rules)).toBe('必須為正數')
      })

      it('returns error when custom validator fails for zero', () => {
        expect(validateField(0, rules)).toBe('必須為正數')
      })

      it('returns null when custom validator passes', () => {
        expect(validateField(10, rules)).toBeNull()
      })
    })

    describe('multiple rules', () => {
      const rules: ValidationRule[] = [
        { required: true, message: '此欄位為必填' },
        { minLength: 2, message: '至少需要 2 個字元' },
        { maxLength: 10, message: '不能超過 10 個字元' },
      ]

      it('returns first matching error (required)', () => {
        expect(validateField('', rules)).toBe('此欄位為必填')
      })

      it('returns minLength error for short string', () => {
        expect(validateField('a', rules)).toBe('至少需要 2 個字元')
      })

      it('returns maxLength error for long string', () => {
        expect(validateField('abcdefghijk', rules)).toBe('不能超過 10 個字元')
      })

      it('returns null when all rules pass', () => {
        expect(validateField('hello', rules)).toBeNull()
      })
    })
  })

  // ------------------------------------------
  // commonRules
  // ------------------------------------------
  describe('commonRules', () => {
    describe('required', () => {
      it('returns a rule with required: true', () => {
        const rule = commonRules.required()
        expect(rule.required).toBe(true)
        expect(rule.message).toBe('此欄位為必填')
      })

      it('accepts a custom message', () => {
        const rule = commonRules.required('名稱必填')
        expect(rule.required).toBe(true)
        expect(rule.message).toBe('名稱必填')
      })
    })

    describe('minLength', () => {
      it('returns a rule with correct minLength', () => {
        const rule = commonRules.minLength(5)
        expect(rule.minLength).toBe(5)
        expect(rule.message).toBe('至少需要 5 個字元')
      })

      it('accepts a custom message', () => {
        const rule = commonRules.minLength(3, '太短了')
        expect(rule.minLength).toBe(3)
        expect(rule.message).toBe('太短了')
      })
    })

    describe('maxLength', () => {
      it('returns a rule with correct maxLength', () => {
        const rule = commonRules.maxLength(100)
        expect(rule.maxLength).toBe(100)
        expect(rule.message).toBe('不能超過 100 個字元')
      })

      it('accepts a custom message', () => {
        const rule = commonRules.maxLength(50, '太長了')
        expect(rule.maxLength).toBe(50)
        expect(rule.message).toBe('太長了')
      })
    })

    describe('email', () => {
      it('returns a rule with email pattern', () => {
        const rule = commonRules.email()
        expect(rule.pattern).toBeInstanceOf(RegExp)
        expect(rule.message).toBe('請輸入有效的電子郵件')
      })

      it('pattern matches valid emails', () => {
        const rule = commonRules.email()
        expect(rule.pattern!.test('user@example.com')).toBe(true)
        expect(rule.pattern!.test('a@b.c')).toBe(true)
        expect(rule.pattern!.test('name+tag@domain.org')).toBe(true)
      })

      it('pattern rejects invalid emails', () => {
        const rule = commonRules.email()
        expect(rule.pattern!.test('not-an-email')).toBe(false)
        expect(rule.pattern!.test('@missing-local.com')).toBe(false)
        expect(rule.pattern!.test('spaces in@email.com')).toBe(false)
      })

      it('accepts a custom message', () => {
        const rule = commonRules.email('Email 格式錯誤')
        expect(rule.message).toBe('Email 格式錯誤')
      })
    })

    describe('taskTitle', () => {
      it('returns an array of ValidationRule', () => {
        const rules = commonRules.taskTitle()
        expect(Array.isArray(rules)).toBe(true)
        expect(rules.length).toBe(3)
      })

      it('includes required, minLength, and maxLength rules', () => {
        const rules = commonRules.taskTitle()
        expect(rules[0].required).toBe(true)
        expect(rules[1].minLength).toBe(2)
        expect(rules[2].maxLength).toBe(100)
      })

      it('validates correctly with validateField', () => {
        const rules = commonRules.taskTitle()
        expect(validateField('', rules)).toBe('任務標題為必填')
        expect(validateField('a', rules)).toBeTruthy()
        expect(validateField('Valid Title', rules)).toBeNull()
      })
    })

    describe('dateRange', () => {
      it('returns a rule with custom validator', () => {
        const rule = commonRules.dateRange('2026-01-01', '2026-12-31')
        expect(rule.custom).toBeInstanceOf(Function)
        expect(rule.message).toBeTruthy()
      })

      it('passes when start date is before end date', () => {
        const rule = commonRules.dateRange('2026-01-01', '2026-12-31')
        expect(rule.custom!(undefined)).toBe(true)
      })

      it('passes when start and end dates are equal', () => {
        const rule = commonRules.dateRange('2026-06-15', '2026-06-15')
        expect(rule.custom!(undefined)).toBe(true)
      })

      it('fails when start date is after end date', () => {
        const rule = commonRules.dateRange('2026-12-31', '2026-01-01')
        expect(rule.custom!(undefined)).toBe(false)
      })

      it('passes when start date is undefined', () => {
        const rule = commonRules.dateRange(undefined, '2026-12-31')
        expect(rule.custom!(undefined)).toBe(true)
      })

      it('passes when end date is undefined', () => {
        const rule = commonRules.dateRange('2026-01-01', undefined)
        expect(rule.custom!(undefined)).toBe(true)
      })

      it('passes when both dates are undefined', () => {
        const rule = commonRules.dateRange(undefined, undefined)
        expect(rule.custom!(undefined)).toBe(true)
      })

      it('works with validateField for invalid range', () => {
        const rule = commonRules.dateRange('2026-12-31', '2026-01-01')
        const result = validateField('any-value', [rule])
        expect(result).toBe('開始日期不能晚於結束日期')
      })
    })
  })
})
