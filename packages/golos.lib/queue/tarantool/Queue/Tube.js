export default class Tube {

  constructor(queue, name) {
    this.queue = queue;
    this.name = name;
  }

  cmd(cmd_name) {
    const {queue: {namespace}, name} = this;
    return `${namespace}.${name}:${cmd_name}`;
  }

  assert() {
  }

  async create() {

  }


}
