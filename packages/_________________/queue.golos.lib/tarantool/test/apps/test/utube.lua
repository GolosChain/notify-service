print(package.path)

box.cfg{listen = 3301}
queue = require 'queue'
queue.start()
box.queue = queue
print("<<<<<<<<<<<<<<< creating tube ...")
box.queue.create_tube('utube', 'utube', {if_not_exists = true})
box.queue.create_tube('fifo', 'fifo', {if_not_exists = true})
-- http://www.troubleshooters.com/codecorn/lua/lualoop.htm

state = {
  READY   = 'r',
  TAKEN   = 't',
  DONE    = '-',
  BURIED  = '!',
  DELAYED = '~',
}


print("<<<<<<<<<<<<<<< seeding ...")

function seed()
  local tasks = {
    {tube = 'a', data = 'a-1'},
    {tube = 'b', data = 'b-1'},
    {tube = 'c', data = 'c-1'},
    {tube = 'a', data = 'a-2'},
    {tube = 'b', data = 'b-2'},
    {tube = 'a', data = 'a-3'},
    {tube = 'd', data = 'd-1'},
    {tube = 'e', data = 'e-1'},
    {tube = 'e', data = 'e-2'},
  }

  for key,value in pairs(tasks) do
    print(key, value.tube, value.data)
    local queue = box.queue;
    local utube = queue.tube.utube;
    local fifo = queue.tube.fifo;
    utube:put(value.data, {utube = value.tube})
    fifo:put(value.data)
  end

end

seed()

-- take task
function take(fullSequence)

  local queue = box.queue;
  local utube = queue.tube.utube;
  -- local spc = queue.tube.utube;
  for key, task in box.space.utube.index.status:pairs(state.READY, { iterator = 'GE' })
  do
    -- if not READY then TAKEN? Nothing more?
      -- do nothing if not 'r'
        -- print('---------------------')
        -- print('|', task[1], task[2], task[3], task[4], task[5])
        -- print('|', 'init  : ', task)
        if task[2] ~= state.READY then
          break
        end

        local taken = box.space.utube.index.utube:min{state.TAKEN, task[3]}
        -- print('|', 'taken : ', taken)
       if taken == nil or taken[2] ~= state.TAKEN then
          -- print('taken == nil or taken[2] ~= state.TAKEN : ', taken)
          -- <iterate only through top untaken item of each subtube consequently>
          -- <and mark it as taken 't'>
        task = box.space.utube:update(task[1], { { '=', 2, state.TAKEN } })
        print('|', task)
          -- self.on_task_change(task, 'take')
          -- return task taken by the above rule to consumer
          if fullSequence ~= true then
            return task
          end
       end
  end

end

take(true)


    -- require('console').start()
-- tarantool /usr/local/etc/tarantool/instances.enabled/app.lua
-- tarantoolctl start app
