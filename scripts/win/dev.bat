set API_GOLOS_URL=ws://127.0.0.1:8091
set API_GCM_KEY=AAA...
set API_QUEUE_HOST=127.0.0.1
docker-compose --file .\\docker-compose-dev.yml down && docker-compose --file .\\docker-compose-dev.yml up -d --build ^
 && yarn && npx lerna bootstrap && npx babel-node ./packages/push.golos.io/src/server.js
