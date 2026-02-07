import { ref, computed } from 'vue'
import { VALIDATION } from '@/constants/pageSettings'

// ============================================
// 表單驗證 Composable - Ralph Loop 迭代 9
// 統一的表單驗證邏輯
// ============================================

export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: unknown) => boolean
  message: string
}

export interface FieldValidation {
  rules: ValidationRule[]
  value: unknown
}

export type ValidationErrors = Record<string, string>

/**
 * 驗證單一欄位
 */
export function validateField(value: unknown, rules: ValidationRule[]): string | null {
  for (const rule of rules) {
    // 必填驗證
    if (rule.required) {
      if (value === null || value === undefined || value === '') {
        return rule.message
      }
    }

    // 字串長度驗證
    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        return rule.message
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        return rule.message
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        return rule.message
      }
    }

    // 自訂驗證
    if (rule.custom && !rule.custom(value)) {
      return rule.message
    }
  }

  return null
}

/**
 * 表單驗證 Hook
 */
export function useFormValidation<T extends Record<string, unknown>>(
  initialValues: T,
  validationSchema: Partial<Record<keyof T, ValidationRule[]>>,
) {
  const formData = ref<T>({ ...initialValues }) as { value: T }
  const errors = ref<ValidationErrors>({})
  const touched = ref<Record<string, boolean>>({})

  /**
   * 驗證單一欄位
   */
  const validateSingleField = (fieldName: keyof T): boolean => {
    const rules = validationSchema[fieldName]
    if (!rules) return true

    const error = validateField(formData.value[fieldName], rules)
    if (error) {
      errors.value[fieldName as string] = error
      return false
    } else {
      delete errors.value[fieldName as string]
      return true
    }
  }

  /**
   * 標記欄位已被觸及
   */
  const touchField = (fieldName: keyof T): void => {
    touched.value[fieldName as string] = true
    validateSingleField(fieldName)
  }

  /**
   * 驗證所有欄位
   */
  const validateAll = (): boolean => {
    let isValid = true
    errors.value = {}

    for (const fieldName of Object.keys(validationSchema) as Array<keyof T>) {
      const fieldValid = validateSingleField(fieldName)
      if (!fieldValid) isValid = false
    }

    return isValid
  }

  /**
   * 重置表單
   */
  const resetForm = (): void => {
    formData.value = { ...initialValues }
    errors.value = {}
    touched.value = {}
  }

  /**
   * 是否有錯誤
   */
  const hasErrors = computed(() => Object.keys(errors.value).length > 0)

  /**
   * 是否可提交
   */
  const canSubmit = computed(() => !hasErrors.value)

  return {
    formData,
    errors,
    touched,
    hasErrors,
    canSubmit,
    validateSingleField,
    validateAll,
    touchField,
    resetForm,
  }
}

// ============================================
// 預定義驗證規則
// ============================================

export const commonRules = {
  required: (message = '此欄位為必填'): ValidationRule => ({
    required: true,
    message,
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    minLength: min,
    message: message || `至少需要 ${min} 個字元`,
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    maxLength: max,
    message: message || `不能超過 ${max} 個字元`,
  }),

  email: (message = '請輸入有效的電子郵件'): ValidationRule => ({
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message,
  }),

  // 任務相關驗證
  taskTitle: (): ValidationRule[] => [
    commonRules.required('任務標題為必填'),
    commonRules.minLength(
      VALIDATION.TASK_TITLE_MIN_LENGTH,
      `標題至少需要 ${VALIDATION.TASK_TITLE_MIN_LENGTH} 個字元`,
    ),
    commonRules.maxLength(
      VALIDATION.TASK_TITLE_MAX_LENGTH,
      `標題不能超過 ${VALIDATION.TASK_TITLE_MAX_LENGTH} 個字元`,
    ),
  ],

  // 專案相關驗證
  projectName: (): ValidationRule[] => [
    commonRules.required('專案名稱為必填'),
    commonRules.minLength(
      VALIDATION.PROJECT_NAME_MIN_LENGTH,
      `名稱至少需要 ${VALIDATION.PROJECT_NAME_MIN_LENGTH} 個字元`,
    ),
    commonRules.maxLength(
      VALIDATION.PROJECT_NAME_MAX_LENGTH,
      `名稱不能超過 ${VALIDATION.PROJECT_NAME_MAX_LENGTH} 個字元`,
    ),
  ],

  // 日期範圍驗證
  dateRange: (startDate: string | undefined, endDate: string | undefined): ValidationRule => ({
    custom: () => {
      if (!startDate || !endDate) return true
      return new Date(startDate) <= new Date(endDate)
    },
    message: '開始日期不能晚於結束日期',
  }),
}
