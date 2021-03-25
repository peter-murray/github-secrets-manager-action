import * as sodium  from 'tweetsodium';
import {requireStringArgumentValue} from '../utils';

export class Encrypt {

  private readonly publicKey: Buffer;

  constructor(publicKey: string) {
    const strValue: string = requireStringArgumentValue('publicKey', publicKey);
    this.publicKey = Buffer.from(strValue, 'base64');
  }

  encryptValue(value: any) {
    const strValue = requireStringArgumentValue('value', value);
    const valueBuffer = Buffer.from(strValue);

    const bytes = sodium.seal(valueBuffer, this.publicKey);
    return Buffer.from(bytes).toString('base64');
  }
}
