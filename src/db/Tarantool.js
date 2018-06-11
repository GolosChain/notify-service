import TarantoolDriver from 'tarantool-driver/lib/connection';
//
export default class Tarantool {
  //
  constructor({host = 'localhost', port = 3301} = {}) {
    // fixme temporary!!!
    const {API_QUEUE_HOST} = process.env;
    host = API_QUEUE_HOST
    //
    // console.log('))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))) ', host, port)
    //
    const connection = this.connection = new TarantoolDriver({host, port, lazyConnect: true});
    this.ready_promise = new Promise((resolve, reject) => {
      if (connection.state === 1) {
        resolve();
      } else {
        connection.connect()
          // .then(() => connection.auth(username, password))
          .then(() => resolve())
          .catch(error => {
            console.log('!!!!!!!!!!!!!!!!!!!!! ', error)
            resolve(false)
          });
      }
    });
  }
  //
  makeCall(call_name, args) {
    // console.log('!!!!!!!!!!!!!!!!!!!!! ', call_name, args)

    return this.ready_promise
      .then(() => this.connection[call_name].apply(this.connection, args))
      .catch(error => Promise.reject(error));
  }
  //
  select() {
    return this.makeCall('select', arguments);
  }

  delete() {
    return this.makeCall('delete', arguments);
  }

  insert() {
    return this.makeCall('insert', arguments);
  }

  replace() {
    return this.makeCall('replace', arguments);
  }

  update() {
    return this.makeCall('update', arguments);
  }

  eval() {
    return this.makeCall('eval', arguments);
  }

  call() {
    return this.makeCall('call', arguments);
  }

  upsert() {
    return this.makeCall('upsert', arguments);
  }
}
