// Ejemplo de pruebas para funciones utilitarias
describe('Helper Functions', () => {
  describe('validateEmail', () => {
    const validateEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    it('debería validar emails correctos', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('test+tag@example.org')).toBe(true);
    });

    it('debería rechazar emails incorrectos', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('formatPhoneNumber', () => {
    const formatPhoneNumber = (phone: string): string => {
      // Remover todos los caracteres no numéricos
      const numbers = phone.replace(/\D/g, '');
      
      // Si tiene 10 dígitos, formatear como (XXX) XXX-XXXX
      if (numbers.length === 10) {
        return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6)}`;
      }
      
      // Si tiene 11 dígitos y empieza con 1, formatear como +1 (XXX) XXX-XXXX
      if (numbers.length === 11 && numbers[0] === '1') {
        return `+1 (${numbers.slice(1, 4)}) ${numbers.slice(4, 7)}-${numbers.slice(7)}`;
      }
      
      return phone; // Devolver original si no coincide con formatos conocidos
    };

    it('debería formatear números de 10 dígitos', () => {
      expect(formatPhoneNumber('1234567890')).toBe('(123) 456-7890');
      expect(formatPhoneNumber('(123) 456-7890')).toBe('(123) 456-7890');
      expect(formatPhoneNumber('123-456-7890')).toBe('(123) 456-7890');
    });

    it('debería formatear números de 11 dígitos que empiecen con 1', () => {
      expect(formatPhoneNumber('11234567890')).toBe('+1 (123) 456-7890');
      expect(formatPhoneNumber('+1 (123) 456-7890')).toBe('+1 (123) 456-7890');
    });

    it('debería devolver el número original si no coincide con formatos conocidos', () => {
      expect(formatPhoneNumber('12345')).toBe('12345');
      expect(formatPhoneNumber('123456789012')).toBe('123456789012');
    });
  });

  describe('generateRandomString', () => {
    const generateRandomString = (length: number): string => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    it('debería generar strings de la longitud correcta', () => {
      expect(generateRandomString(10)).toHaveLength(10);
      expect(generateRandomString(5)).toHaveLength(5);
      expect(generateRandomString(0)).toHaveLength(0);
    });

    it('debería generar strings únicos', () => {
      const string1 = generateRandomString(10);
      const string2 = generateRandomString(10);
      expect(string1).not.toBe(string2);
    });

    it('debería contener solo caracteres alfanuméricos', () => {
      const randomString = generateRandomString(20);
      expect(randomString).toMatch(/^[A-Za-z0-9]+$/);
    });
  });

  describe('calculateAge', () => {
    const calculateAge = (birthDate: Date): number => {
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age;
    };

    it('debería calcular la edad correctamente', () => {
      const today = new Date();
      const birthDate = new Date(today.getFullYear() - 25, today.getMonth(), today.getDate());
      expect(calculateAge(birthDate)).toBe(25);
    });

    it('debería manejar fechas futuras', () => {
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 año en el futuro
      expect(calculateAge(futureDate)).toBeLessThan(0);
    });
  });

  describe('sanitizeInput', () => {
    const sanitizeInput = (input: string): string => {
      return input
        .trim()
        .replace(/[<>]/g, '') // Remover caracteres HTML básicos
        .replace(/\s+/g, ' '); // Normalizar espacios en blanco
    };

    it('debería limpiar espacios en blanco', () => {
      expect(sanitizeInput('  hello world  ')).toBe('hello world');
      expect(sanitizeInput('hello   world')).toBe('hello world');
    });

    it('debería remover caracteres HTML básicos', () => {
      expect(sanitizeInput('hello<script>alert("xss")</script>world')).toBe('helloscriptalert("xss")/scriptworld');
      expect(sanitizeInput('test<tag>content</tag>')).toBe('testtagcontent/tag');
    });

    it('debería manejar strings vacíos', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput('   ')).toBe('');
    });
  });
});
