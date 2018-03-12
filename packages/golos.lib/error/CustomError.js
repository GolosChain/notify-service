export default class CustomError extends Error {

  name = this.constructor.name;

  constructor(message) {
    super(message);
  }
}
