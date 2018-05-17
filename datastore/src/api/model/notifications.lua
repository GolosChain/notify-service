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
