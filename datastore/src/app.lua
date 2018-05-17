io.output():setvbuf("no")
--
box.cfg {
  log_level = 5,
  listen = '0.0.0.0:3301',
  wal_dir   = "/var/lib/tarantool",
  memtx_dir = "/var/lib/tarantool",
  vinyl_dir = "/var/lib/tarantool",
  log       = "/var/log/tarantool",
}
--
box.once('bootstrap', function()
  box.schema.user.grant('guest', 'read,write,execute,create,drop,alter ', 'universe')
  box.session.su('guest')
  --notifications = box.schema.create_space('notifications')
  --notifications:create_index('primary', { type = 'tree', parts = { 1, 'STR' } })
end)
--
queue = require 'queue'
queue.start()
box.queue = queue
-- todo pass real config object
dbapi = require('api')
notifications = dbapi.notifications
notification_add = notifications.create
notification_get_by_id = notifications.get_by_id

--
require('console').start()
