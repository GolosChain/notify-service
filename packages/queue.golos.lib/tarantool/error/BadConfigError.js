import Errors from 'error.golos.lib';

const {CustomError} = Errors;

console.log(`@@@@@@@@@@@@@@@@@@@@@@@@@@@`)
console.log(CustomError)


export default class BadConfigError extends CustomError {

}
