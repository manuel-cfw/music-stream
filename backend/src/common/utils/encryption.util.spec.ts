import { encrypt, decrypt, generateEncryptionKey } from './encryption.util';

describe('Encryption Utility', () => {
  const testKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt a string', () => {
      const plaintext = 'Hello, World!';
      const encrypted = encrypt(plaintext, testKey);
      const decrypted = decrypt(encrypted, testKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for the same plaintext (random IV)', () => {
      const plaintext = 'Hello, World!';
      const encrypted1 = encrypt(plaintext, testKey);
      const encrypted2 = encrypt(plaintext, testKey);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle empty strings', () => {
      const plaintext = '';
      const encrypted = encrypt(plaintext, testKey);
      const decrypted = decrypt(encrypted, testKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle long strings', () => {
      const plaintext = 'A'.repeat(10000);
      const encrypted = encrypt(plaintext, testKey);
      const decrypted = decrypt(encrypted, testKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters and unicode', () => {
      const plaintext = '🎵 Music! Ñoño こんにちは';
      const encrypted = encrypt(plaintext, testKey);
      const decrypted = decrypt(encrypted, testKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw error with wrong key', () => {
      const plaintext = 'Hello, World!';
      const encrypted = encrypt(plaintext, testKey);
      const wrongKey = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';

      expect(() => decrypt(encrypted, wrongKey)).toThrow();
    });

    it('should throw error with invalid key length', () => {
      const plaintext = 'Hello, World!';
      const shortKey = '0123456789abcdef';

      expect(() => encrypt(plaintext, shortKey)).toThrow('Encryption key must be 32 bytes');
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate a 64-character hex string', () => {
      const key = generateEncryptionKey();

      expect(key).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(key)).toBe(true);
    });

    it('should generate unique keys', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();

      expect(key1).not.toBe(key2);
    });
  });
});
