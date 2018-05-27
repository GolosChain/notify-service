call yarn
docker-compose --file .\docker-compose-dev.yml down
docker-compose --file .\docker-compose-dev.yml up -d --build

set API_GOLOS_URL=ws://127.0.0.1:8091
REM set API_GOLOS_URL=wss://ws.golos.io
set API_QUEUE_HOST=127.0.0.1
set API_GCM_KEY=AAA...

npx babel-node ./src/server.js



REM set API_GOLOS_URL=ws://127.0.0.1:8091
REM set API_GCM_KEY=AAA...
REM set API_QUEUE_HOST=127.0.0.1

REM docker-compose --file .\\docker-compose-dev.yml down && docker-compose --file .\\docker-compose-dev.yml up -d --build ^
REM  && yarn && npx lerna bootstrap && npx babel-node ./packages/push.golos.io/src/server.js
