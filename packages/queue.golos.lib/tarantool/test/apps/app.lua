io.output():setvbuf("no")
--
box.cfg {
    log_level = 5,
    listen = '0.0.0.0:3301',
    -- slab_alloc_arena = 1.0,
    -- wal_dir    = "/var/lib/tarantool",
    -- snap_dir   = "/var/lib/tarantool",
    -- vinyl_dir = "/var/lib/tarantool"
}
--
box.once('bootstrap', function()
  -- box.schema.user.grant('guest', 'read,write,execute,create,drop,alter ', 'universe')
  -- box.session.su('guest')
  -- raw space of operations
  --
  block_data = box.schema.create_space('block_data')
  -- with an auto incremented
  -- box.schema.sequence.create('opSequence')
  -- first field that has no business value, just index
  -- ops:create_index('i', {sequence='opSequence'})
  -- block data indexed by unique block number (unsigned int)
  block_data:create_index('primary', {type = 'tree', parts = {1, 'unsigned'}})

end)
--
queue = require 'queue'
queue.start()
box.queue = queue
