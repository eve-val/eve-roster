import { VError, Info } from 'verror';
import { EsiError, EsiErrorKind } from './EsiError';


/**
 * Errors generated by fetchEndpoint(). Signature-compatible with errors used
 * by the eve-swagger lib.
 */
export class EsiErrorCompat extends VError implements EsiError {
  public readonly kind: EsiErrorKind;

  constructor(kind: EsiErrorKind, message: string, causedBy?: Error) {
    super({
      name: 'EsiErrorCompat',
      cause: causedBy,
    }, message);
    this.kind = kind;
  }

  get info(): Info {
    return VError.info(this);
  }

  get fullStack(): string {
    return VError.fullStack(this);
  }
}
