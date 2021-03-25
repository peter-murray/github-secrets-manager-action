import { expect } from 'chai';
import {Encrypt} from './Encrypt'

const PUBLIC_KEY: string = 'S953BUzsjznd35oVNTJvlg4iesXZuAL6PS4NB+2EXB0=';

describe('Encrypt', () => {

  describe('using a valid public key', () => {
    const encrypt = new Encrypt(PUBLIC_KEY);

    it('should encrypt "hello"', async () => {
      const encrypted = encrypt.encryptValue('hello');
      expect(encrypted).has.length.greaterThan(0);
    });

    it('should encrypt "hello world"', async () => {
      const encrypted = encrypt.encryptValue('hello world');
      expect(encrypted).has.length.greaterThan(0);
    });

    it('should encrypt 123456789', async () => {
      const encrypted = encrypt.encryptValue(123456789);
      expect(encrypted).has.length.greaterThan(0);
    });

    it('should fail on encrypting null', async () => {
      try {
        encrypt.encryptValue(null);
      } catch(err) {
        expect(err.message).to.contain('Need to provide a value');
      }
    });

    it('should fail on encrypting undefined', async () => {
      try {
        encrypt.encryptValue(undefined);
      } catch(err) {
        expect(err.message).to.contain('Need to provide a value');
      }
    });

    it('should fail on encrypting an empty string', async () => {
      try {
        encrypt.encryptValue('');
      } catch(err) {
        expect(err.message).to.contain('was zero length or empty string');
      }
    });
  });
});