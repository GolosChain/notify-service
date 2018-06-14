--https://habr.com/company/mailru/blog/334266/
--https://ilovelua.wordpress.com/tag/require/
local model = {}
--
local digest = require('digest')
local uuid = require('uuid')
--local validator =  require('authman.validator')
--
model.spaceName = 'notifications'
model.indexPrimary = 'primary'
model.indexBlock = 'indexBlock'
model.indexTarget = 'indexTarget'
model.indexTargetType = 'indexTargetType'
model.indexTargetTouched = 'indexTargetTouched'

--
model.id = 1
model.block = 2
model.timestamp = 3
model.type = 4
model.targetId = 5
model.touched = 6
model.payload = 7
--
function model.get_space()
  return box.space[model.spaceName]
end
--
function model.get_by_id(nId)
  return model.get_space():get(nId)
end
--
function model.get_by_block(blockId)
    return model.get_space().index[model.indexBlock]:select({blockId})
end
--
function model.get_by_target(targetId)
  return model.get_space().index[model.indexTarget]:select({targetId})
end

function model.get_by_target_type(targetId, type, timestamp)
  return model.get_space().index[model.indexTarget]:select({targetId, type, timestamp})
end


function model.get_latest_by_target(targetId, type, limit)
  local currentTime = os.time()
  -- get all the records by notification type for user
  local list = model.get_space()
    .index[model.indexTargetType]:select(
      {targetId, type}
  )
  local sorted = {}
  -- transform tuples to tables
  for k, tuple in pairs(list) do
    table.insert(sorted, tuple:totable())
  end
  -- sort by timestamp descending
  table.sort(sorted, function(a,b)
    return a[3]>b[3]
  end)
  -- get first 'limit' (freshest) elements
  local sliced = {}
  for k, v in pairs(sorted) do
    if k > limit then
      break
    end
    table.insert(sliced, v)
  end

  return sliced

end

--
function model.get_untouched_count_by_target(targetId)
  return #model.get_space().index[model.indexTargetTouched]:select({targetId, 0})
end
--
function model.create(user_tuple)
  local result = model.get_by_id(user_tuple[model.id])
  --
  if not result then
    result = model.get_space():insert(user_tuple)
  end
  --
  return result
end
--
return model
