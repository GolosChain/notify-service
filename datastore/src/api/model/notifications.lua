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
model.indexTarget = 'indexTarget'
--
model.id = 1
model.timestamp = 2
model.type = 3
model.targetId = 4
model.touched = 5
model.payload = 6
--
function model.get_space()
  return box.space[model.spaceName]
end
--
function model.get_by_id(nId)
  return model.get_space():get(nId)
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
