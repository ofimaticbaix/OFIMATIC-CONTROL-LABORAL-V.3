export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

export type AccountType = 'worker' | 'admin';

/**
 * Validates password based on account type:
 * - Worker: exactly 4 digits
 * - Admin: 6-12 characters with letters, numbers, and special characters allowed
 */
export function validatePassword(password: string, accountType: AccountType = 'admin'): PasswordValidationResult {
  const errors: string[] = [];

  if (accountType === 'worker') {
    // Workers: exactly 4 digits
    if (!/^\d{4}$/.test(password)) {
      errors.push('Debe ser una clave de 4 dígitos');
    }
    
    const isValid = errors.length === 0;
    return { isValid, errors, strength: isValid ? 'strong' : 'weak' };
  }

  // Administrators: 6-12 characters
  if (password.length < 6) {
    errors.push('Mínimo 6 caracteres');
  }
  
  if (password.length > 12) {
    errors.push('Máximo 12 caracteres');
  }

  const isValid = errors.length === 0;
  
  // Calculate strength for admin passwords
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[@$!%*?&#_\-+.]/.test(password);
  
  const strengthFactors = [hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;
  
  if (isValid && strengthFactors >= 3) {
    strength = 'strong';
  } else if (isValid && strengthFactors >= 2) {
    strength = 'medium';
  }

  return { isValid, errors, strength };
}

/**
 * Returns a user-friendly message with password requirements based on account type
 */
export function getPasswordRequirementsMessage(accountType: AccountType = 'admin'): string {
  if (accountType === 'worker') {
    return 'Clave de acceso: 4 dígitos numéricos';
  }
  return 'La contraseña debe tener entre 6 y 12 caracteres. Puede incluir letras, números y símbolos';
}
