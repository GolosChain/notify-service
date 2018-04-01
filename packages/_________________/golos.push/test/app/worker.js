const SCWorker = require('socketcluster/scworker');
const express = require('express');
const serveStatic = require('serve-static');
const path = require('path');
const morgan = require('morgan');
const healthChecker = require('sc-framework-health-check');

class Worker extends SCWorker {
  run() {
    let c1 = 0;
    let c2 = 0;
    let c3 = 0;



    console.log('   >> Worker PID:', process.pid);
    const environment = this.options.environment;
    const app = express();
    const httpServer = this.httpServer;
    const scServer = this.scServer;
    if (environment === 'dev') {
      // Log every HTTP request. See https://github.com/expressjs/morgan for other
      // available formats.
      app.use(morgan('dev'));
    }
    app.use(serveStatic(path.resolve(__dirname, 'public')));

    // Add GET /health-check express route
    healthChecker.attach(this, app);

    httpServer.on('request', app);

    let count = 0;

    /*
      In here we handle our incoming realtime connections and listen for events.
    */
    // scServer.on('connection', socket => {
    //
    //   // Some sample logic to show how to handle client events,
    //   // replace this with your own logic
    //
    //   socket.on('sampleClientEvent', data => {
    //     count++;
    //     console.log('Handled sampleClientEvent', data);
    //     scServer.exchange.publish('sample', count);
    //   });
    //
    //
    //   socket.on('disconnect', () => {
    //     clearInterval(interval);
    //   });
    // });

    const interval = setInterval(() => {
      scServer.exchange.publish('a153048', {
        rand: c1
      });
      c1++;
    }, 3000);

    const interval2 = setInterval(() => {
      scServer.exchange.publish('c153048', {
        rand: c2
      });
      c2--;
    }, 5000);

    const interval3 = setInterval(() => {
      scServer.exchange.publish('b153048', {
        rand: c3
      });
      c3 = (c3 + 1) * 1000;
    }, 5000);



  }
}

new Worker();
