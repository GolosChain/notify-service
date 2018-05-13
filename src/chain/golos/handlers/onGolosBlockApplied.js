import TarantoolDriver from 'tarantool-driver/lib/connection';
//
const tnt = new TarantoolDriver({host: 'localhost', port: 3301});
tnt.on('connect', data => {
  console.log('[xxxxxxxxxxxxxxxxxx ] tarantool driver connected!');
});

//
export default async block => {
  // console.log('++++++++++ ', block);

  const {operations} = block;
  for (const operation of operations) {
    console.log(operation[0]);
  }

  // const index = block.index.toString();
  //
  // const res = await tnt.call('notification_add', [index, 22222, 'transfer', 'a153048', 0, 'blabla']);
  // console.log('************** ', res);
};
