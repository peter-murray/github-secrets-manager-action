import {describe, it, expect} from 'vitest';
import {Encrypt} from './Encrypt.js'

const PUBLIC_KEY: string = 'S953BUzsjznd35oVNTJvlg4iesXZuAL6PS4NB+2EXB0=';

describe('Encrypt', () => {

  describe('using a valid public key', () => {
    const encrypt = new Encrypt(PUBLIC_KEY);

    it('should encrypt "hello"', async () => {
      const encrypted = await encrypt.encryptValue('hello');
      expect(encrypted).has.length.greaterThan(0);
    });

    it('should encrypt "hello world"', async () => {
      const encrypted = await encrypt.encryptValue('hello world');
      expect(encrypted).has.length.greaterThan(0);
    });

    it('should encrypt 123456789', async () => {
      const encrypted = await encrypt.encryptValue(123456789);
      expect(encrypted).has.length.greaterThan(0);
    });

    it('should fail on encrypting null', async () => {
      try {
        await encrypt.encryptValue(null);
      } catch(err: any) {
        expect(err.message).to.contain('Need to provide a value');
      }
    });

    it('should fail on encrypting undefined', async () => {
      try {
        await encrypt.encryptValue(undefined);
      } catch(err: any) {
        expect(err.message).to.contain('Need to provide a value');
      }
    });

    it('should fail on encrypting an empty string', async () => {
      try {
        await encrypt.encryptValue('');
      } catch(err: any) {
        expect(err.message).to.contain('was zero length or empty string');
      }
    });
  });
});