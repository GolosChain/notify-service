import {isUri} from 'valid-url';
import * as url from 'url';

export default class Endpoint {
  constructor({uri}) {
    if (isUri(uri)) {
      Object.assign(this, url.parse(uri));
    } else {
      throw new Error('Sniffer: please, provide a valid URI as a sole constructor argument');
    }
  }
}
