import GProxy from './lib/proxy';
// console.log(require('path').join(__dirname, '..'));
// require('app-module-path').addPath(require('path').join(__dirname, '..'));
// // ! all further absolute import paths have the current dir as a root !
const proxy = new GProxy({
  source: 'wss://ws.golos.io',
  target: 'ws://bla.bla'
});
//
proxy.start();
