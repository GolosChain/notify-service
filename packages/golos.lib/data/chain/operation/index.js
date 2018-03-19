import {map as typeMap, map} from './type';

export default class Operation {
  // factory
  // create and return the Operation instance according to passed data
  static instance(op) {
    const {type} = op;
    const instanceConstructor = map[type];
    return new instanceConstructor(op);
  }
  // detect if operation's implemented and can be processed
  static implemented(op) {
    const {type, data} = op;
    let result = false;
    // let the comment and new post be different operations
    if (type === 'comment') {
      const {parent_author} = data;
      // ignore post creation for now
      result = !(parent_author.length === 0);
    } else {
      result = (type in typeMap);
    }

    return result;

  }
}
