import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export class SecurityManager {
  static algorithm = 'aes-256-gcm';
  static keyLength = 32;
  static ivLength = 16;
  static saltLength = 64;
  static tagLength = 16;
  static iterations = 10000;

  // Generate encryption key from environment variable
  static getEncryptionKey() {
    const key = process.env.ENCRYPTION_KEY;
    
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is not set');
    }

    // Derive a consistent key using PBKDF2
    return crypto.pbkdf2Sync(
      key, 
      'careerboost_salt', 
      this.iterations, 
      this.keyLength, 
      'sha512'
    );
  }

  // Encrypt sensitive data
  static encryptSensitiveData(data) {
    try {
      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(this.ivLength);
      
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      cipher.setAAD(Buffer.from('CareerBoostSecureData'));
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Combine IV + authTag + encrypted data
      const combined = Buffer.concat([iv, authTag, Buffer.from(encrypted, 'hex')]);
      
      return {
        encrypted: true,
        data: combined.toString('base64'),
        version: '1.0',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt sensitive data');
    }
  }

  // Decrypt sensitive data
  static decryptSensitiveData(encryptedData) {
    try {
      if (!encryptedData || !encryptedData.encrypted) {
        return encryptedData; // Return as-is if not encrypted
      }

      const key = this.getEncryptionKey();
      const combined = Buffer.from(encryptedData.data, 'base64');
      
      // Extract IV (first 16 bytes)
      const iv = combined.slice(0, this.ivLength);
      
      // Extract auth tag (next 16 bytes)
      const authTag = combined.slice(this.ivLength, this.ivLength + this.tagLength);
      
      // Extract encrypted data (remaining bytes)
      const encrypted = combined.slice(this.ivLength + this.tagLength);
      
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAAD(Buffer.from('CareerBoostSecureData'));
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt sensitive data - possible corruption or tampering');
    }
  }

  // Hash password with bcrypt
  static async hashPassword(password) {
    try {
      if (!password || password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      const saltRounds = 12;
      return await bcrypt.hash(password, saltRounds);
    } catch (error) {
      console.error('Password hashing error:', error);
      throw new Error('Failed to hash password');
    }
  }

  // Verify password
  static async verifyPassword(password, hash) {
    try {
      if (!password || !hash) {
        return false;
      }
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  // Generate secure random token
  static generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Generate API key
  static generateAPIKey(prefix = 'cb') {
    const randomPart = crypto.randomBytes(24).toString('hex');
    const timestamp = Date.now().toString(36);
    return `${prefix}_${randomPart}_${timestamp}`;
  }

  // Generate secure random number
  static generateSecureRandom(min, max) {
    const range = max - min;
    const bits = Math.ceil(Math.log2(range));
    const bytes = Math.ceil(bits / 8);
    const maxValue = Math.pow(2, bits);
    
    let value;
    do {
      const randomBytes = crypto.randomBytes(bytes);
      value = randomBytes.readUIntBE(0, bytes) % maxValue;
    } while (value >= range);
    
    return min + value;
  }

  // Validate email format
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Sanitize input against XSS
  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .trim();
  }

  // Validate South African phone number
  static validateSAPhoneNumber(phone) {
    const phoneRegex = /^(\+27|0)[6-8][0-9]{8}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  // Generate cryptographic signature for data
  static generateSignature(data, secret) {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(data));
    return hmac.digest('hex');
  }

  // Verify cryptographic signature
  static verifySignature(data, signature, secret) {
    const expectedSignature = this.generateSignature(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  // Password strength checker
  static checkPasswordStrength(password) {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /\d/.test(password),
      symbols: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };

    const score = Object.values(checks).filter(Boolean).length;
    let strength = 'weak';

    if (score >= 4) strength = 'good';
    if (score >= 5) strength = 'strong';

    return {
      score,
      strength,
      checks
    };
  }

  // Generate secure file name
  static generateSecureFileName(originalName) {
    const extension = originalName.split('.').pop();
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `file_${timestamp}_${random}.${extension}`;
  }

  // Encrypt file buffer
  static encryptFileBuffer(buffer) {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(this.ivLength);
    
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();
    
    return Buffer.concat([iv, authTag, encrypted]);
  }

  // Decrypt file buffer
  static decryptFileBuffer(encryptedBuffer) {
    const key = this.getEncryptionKey();
    
    const iv = encryptedBuffer.slice(0, this.ivLength);
    const authTag = encryptedBuffer.slice(this.ivLength, this.ivLength + this.tagLength);
    const encrypted = encryptedBuffer.slice(this.ivLength + this.tagLength);
    
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  // Generate secure session ID
  static generateSessionId() {
    return crypto.randomBytes(32).toString('hex') + Date.now().toString(36);
  }

  // Create password reset token
  static generatePasswordResetToken() {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
    return { token, expires };
  }

  // Rate limiting key generator
  static generateRateLimitKey(identifier, action) {
    const day = new Date().toISOString().split('T')[0];
    return `rate_limit:${action}:${identifier}:${day}`;
  }
}

export default SecurityManager;
