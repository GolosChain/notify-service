import TarantoolDriver from 'tarantool-driver/lib/connection';
//
export default class Tarantool {
  constructor({host = 'localhost', port = 3301} = {}) {
    const connection = this.connection = new TarantoolDriver({host, port});
    connection.on('connect', data => {
      console.log('[xxxxxxxxxxxxxxxxxx ] tarantool driver connected!');
    });
  }
  //
  //
  select() {
    return this.makeCall('select', arguments);
  }
  //
  delete() {
    return this.makeCall('delete', arguments);
  }
  //
  insert() {
    return this.makeCall('insert', arguments);
  }
  //
  replace() {
    return this.makeCall('replace', arguments);
  }
  //
  update() {
    return this.makeCall('update', arguments);
  }
  //
  eval() {
    return this.makeCall('eval', arguments);
  }
  //
  async call = ({what, ...params}) => {
    console.log()
    // const result await this.connection.call(what, ...params)
  }
  //
  upsert() {
    return this.makeCall('upsert', arguments);
  }
}
