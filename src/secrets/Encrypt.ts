import sodium  from 'libsodium-wrappers';
import {requireStringArgumentValue} from '../utils.js';

export class Encrypt {

  private readonly publicKey: string;

  constructor(publicKey: string) {
    const strValue: string = requireStringArgumentValue('publicKey', publicKey);
    this.publicKey = strValue
  }

  async encryptValue(value: any) {
    const strValue = requireStringArgumentValue('value', value);

    await sodium.ready;
    const binaryKey = sodium.from_base64(this.publicKey, sodium.base64_variants.ORIGINAL);
    const binarySecret = sodium.from_string(strValue);

    let encodedBytes = sodium.crypto_box_seal(binarySecret, binaryKey);

    const encryptedValue = sodium.to_base64(encodedBytes, sodium.base64_variants.ORIGINAL);
    return encryptedValue;
  }
}
