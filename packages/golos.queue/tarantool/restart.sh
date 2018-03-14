#! /bin/bash
docker-compose restart golos.queue.tarantool &
docker-compose logs -f -t
# docker exec -it tarantool_golos.queue.tarantool_1 console
