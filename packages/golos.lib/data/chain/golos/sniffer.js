import PersistentWebSocket from '../../transport/WebSocket/Persistent';

export default function({url, emitter} = {}) {
  const WS = url;
  const CHANNEL = 'blockschannel';
  const redKey = 'lastblocknumber';
  console.log('[x] sniffer started');
  // make the connection persistent
  // todo implement reconnect on socket stuck
  const ws = new PersistentWebSocket(WS);

  const redis = require('redis');
  const client = redis.createClient();
  const pub = redis.createClient();
  const END = '\x1b[0m';
  const RED = '\x1b[31m';
  const GREEN = '\x1b[36m';

  let height = 0;
  let next = 0;
  // const nodeparam = process.argv.slice(2);
  let getNOW = false;//nodeparam[0] === 'now';
  client.get(redKey, (err, num) => {
    if (!Number(num)) {
      getNOW = true;
    }
  });

  console.log('@@@@@@@@@@@@@@@@@@@@', getNOW);


  // let targetheight = (!isNaN(nodeparam[0])) ? nodeparam[0] : false;
  const fheight = 0;
  let timestamp = 0;
  // if (targetheight) { fheight = Number(targetheight); client.set(redKey, fheight); targetheight = false; }
  //
  //
  const getOps = (sequentBlock, speed) => {
    ws.send(JSON.stringify({
      id: speed,
      method: 'call',
      params: ['database_api', 'get_ops_in_block', [sequentBlock, 'false']]
    }), e => {
      if (e) return console.warn(e);
    });

  };

  const Tl = D => {
    const txTimes = [];
    for (const tx of D) {
      txTimes.push(Date.parse(tx.timestamp));
    }
    return Math.max(...txTimes);
  };
  //
  const Send = (operations, ProcessedBlockNum, ProcessedOpTime) => {
    const ops = [];
    for (const op of operations) {
      ops.push(op);
    }
    const JSONops = JSON.stringify(ops);
    const opslength = ops.length;
    const delta = height + 1 - ProcessedBlockNum;
    const state = (ProcessedBlockNum > height) ? '{mode: realtime}' : `{mode: fast}{left: ${delta}}`;
    const golostime = Date.parse(timestamp);
    const ageLastOps = (golostime - ProcessedOpTime) / 1000;
    // console.log(`🔘 ${GREEN}${ProcessedBlockNum} ${END} ${RED}⌛️${ageLastOps} ${END} [🔴 ${height + 1}] ${state}  📓 ${ops.length} 📐 ${JSONops.length}`);
    // console.log(`${(ProcessedBlockNum > height) ? '' : `[${height + 1}] >> `}${ProcessedBlockNum} [${ops.length}]`);
    client.set(redKey, ProcessedBlockNum);
    if (ProcessedBlockNum <= height)getOps(ProcessedBlockNum + 1, 3);
    // let the subscribers know that block boilerplate is ready
    emitter.emit('block', {
      index: ProcessedBlockNum,
      transactions: ops
    });


    return pub.publish(CHANNEL, JSONops);
  };
  //
  ws.on(
    'message',
    e => {
      const {data: raw} = e;
      if (!raw) {
        console.log('[x] no data on socket message!');
        return;
      }
      let data;
      try {
        data = JSON.parse(raw);
      } catch (e) {
        console.log('[x] error parsing message data to JSON!');
        return;
      }
      // everything's parsed here, process :
      if (data.method === 'notice' && data.params) {
        const hex = data.params[1][0].previous.slice(0, 8);
        height = parseInt(hex, 16);
        timestamp = data.params[1][0].timestamp;
        if (getNOW || height < fheight) client.set(redKey, height);
        client.get(redKey, (err, num) => {
          const lastblock = Number(num);
          // console.log(`[>lastblock] ${lastblock}`);
          next = height - 1;
          if (lastblock) next = lastblock + 1;
          const delta = height - next;
          if (delta < 0) return getOps(next, 2);
          else if (lastblock < height) return getOps(next, 3);
        });
      } else if (data.id === 2) {
        const lastTime = Tl(data.result);
        Send(data.result, next, lastTime);
      } else if (data.id === 3) {
        client.get(redKey, (err, num) => {
          const lastblock = Number(num);
          if (lastblock > height) return;
          const lastTime = Tl(data.result);
          Send(data.result, lastblock + 1, lastTime);
        });
      }
    });

  ws.on('open', () => {
    console.log('[x] block application callback requested');
    console.log('[x] start listening ...');
    //
    ws.send(JSON
      .stringify({
        id: 1,
        method: 'call',
        'params': ['database_api', 'set_block_applied_callback', [0]]
      }), e => {
      if (e) return console.warn(e);
    });
  });
}


// for  pm2:
/* ws.on('close', function close() {
	console.warn('Reload');
	process.exit(0);
  });
 */
