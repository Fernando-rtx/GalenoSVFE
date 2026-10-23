/** Error común del cliente. No interpreta ni inventa códigos del backend. */
export default class DefaultError extends Error {
  constructor({ type, code, message, status = null, details = null, headers = {}, cause = null }) {
    super(message);
    this.name = 'DefaultError';
    this.type = type;
    this.code = code;
    this.status = status;
    this.details = details;
    this.headers = Object.freeze(Object.assign({}, headers));
    this.cause = cause;
  }

  toJSON() {
    return {
      name: this.name, type: this.type, code: this.code,
      message: this.message, status: this.status,
      details: this.details, headers: this.headers
    };
  }

  static validation(message, code = 'INVALID_PARAMETER', cause = null) {
    return new DefaultError({ type: 'validation', code, message, cause });
  }

  static processing(message, cause = null, status = null, headers = {}) {
    return new DefaultError({ type: 'processing', code: 'INVALID_RESPONSE', message, cause, status, headers });
  }
}
