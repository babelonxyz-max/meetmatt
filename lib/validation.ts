import { ValidationError } from "./errors";

// Validation helpers
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function validateMinLength(str: string, min: number): boolean {
  return str.length >= min;
}

export function validateMaxLength(str: string, max: number): boolean {
  return str.length <= max;
}

export function validateRequired(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

export function validateRange(num: number, min: number, max: number): boolean {
  return num >= min && num <= max;
}

// Field validator class
export class FieldValidator<T> {
  private value: T;
  private fieldName: string;
  private errors: string[] = [];

  constructor(value: T, fieldName: string) {
    this.value = value;
    this.fieldName = fieldName;
  }

  static of<T>(value: T, fieldName: string): FieldValidator<T> {
    return new FieldValidator(value, fieldName);
  }

  required(message?: string): this {
    if (!validateRequired(this.value)) {
      this.errors.push(message || `${this.fieldName} is required`);
    }
    return this;
  }

  minLength(min: number, message?: string): this {
    if (typeof this.value === "string" && !validateMinLength(this.value, min)) {
      this.errors.push(
        message || `${this.fieldName} must be at least ${min} characters`
      );
    }
    return this;
  }

  maxLength(max: number, message?: string): this {
    if (typeof this.value === "string" && !validateMaxLength(this.value, max)) {
      this.errors.push(
        message || `${this.fieldName} must be at most ${max} characters`
      );
    }
    return this;
  }

  email(message?: string): this {
    if (typeof this.value === "string" && !validateEmail(this.value)) {
      this.errors.push(message || `${this.fieldName} must be a valid email`);
    }
    return this;
  }

  url(message?: string): this {
    if (typeof this.value === "string" && !validateUrl(this.value)) {
      this.errors.push(message || `${this.fieldName} must be a valid URL`);
    }
    return this;
  }

  range(min: number, max: number, message?: string): this {
    if (typeof this.value === "number" && !validateRange(this.value, min, max)) {
      this.errors.push(
        message || `${this.fieldName} must be between ${min} and ${max}`
      );
    }
    return this;
  }

  custom(validator: (value: T) => boolean, message: string): this {
    if (!validator(this.value)) {
      this.errors.push(message);
    }
    return this;
  }

  validate(): void {
    if (this.errors.length > 0) {
      throw new ValidationError(this.errors[0], {
        field: this.fieldName,
        errors: this.errors,
      });
    }
  }

  getErrors(): string[] {
    return this.errors;
  }

  isValid(): boolean {
    return this.errors.length === 0;
  }
}

// Object validator
export function validateObject<T extends Record<string, unknown>>(
  obj: T,
  rules: {
    [K in keyof T]?: (validator: FieldValidator<T[K]>) => FieldValidator<T[K]>;
  }
): void {
  const errors: Record<string, string[]> = {};

  for (const [key, rule] of Object.entries(rules)) {
    if (rule) {
      const validator = new FieldValidator(obj[key], key as string);
      rule(validator);
      const fieldErrors = validator.getErrors();
      if (fieldErrors.length > 0) {
        errors[key] = fieldErrors;
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError("Validation failed", errors);
  }
}
