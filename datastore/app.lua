io.output():setvbuf("no")
--
box.cfg {
  log_level = 5,
  listen = '0.0.0.0:3301',
  wal_dir = "/var/lib/tarantool",
  snap_dir = "/var/lib/tarantool",
  vinyl_dir = "/var/lib/tarantool"
}
--
box.once('bootstrap', function()
   box.schema.user.grant('guest', 'read,write,execute,create,drop,alter ', 'universe')
   box.session.su('guest')
end)
--
queue = require 'queue'
queue.start()
box.queue = queue
