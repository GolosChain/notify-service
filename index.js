// import chains from './packages/chain.golos.lib';
//
// const {Golos} = chains;
// // todo add parameters to the constructor
// const golos = new Golos();

const golos = require('golos-js')
const api = golos.api;
const config = golos.config;
config.set('websocket', 'ws://127.0.0.1:8091');
// config.set('chain_id', '5876894a41e6361bde2e73278f07340f2eb8b41c2facd29099de9deef6cdb679')


async function take() {
  const post = await api.getContentAsync('a153048', 'a153048-post5');
  console.log(post);
}

take();

