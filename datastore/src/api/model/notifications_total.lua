--https://habr.com/company/mailru/blog/334266/
--https://ilovelua.wordpress.com/tag/require/
local model = {}
--
local digest = require('digest')
local uuid = require('uuid')
--local validator =  require('authman.validator')
--
model.spaceName = 'notifications_total'
model.indexPrimary = 'primary'
--
model.user_id = 1
model.count_all = 2
model.count_comment = 3
model.count_transfer = 4
model.count_upvote = 5
model.count_downvote = 6


function model.get_space()
  return box.space[model.spaceName]
end

function model.get_by_id(nId)
  return model.get_space():get(nId)
end

function model.update(t)
  local space = model.get_space()
  local exists = #space:select { t[model.user_id] } > 0
  local updated = t

  if exists then
     updated = space:update(t[model.user_id], {
      { '+', model.count_all, t[model.count_all] },
      { '+', model.count_comment, t[model.count_comment] },
      { '+', model.count_transfer, t[model.count_transfer] },
      { '+', model.count_upvote, t[model.count_upvote] },
      { '+', model.count_downvote, t[model.count_downvote] },
    })
  else
    space:insert(t)
  end

  return updated
end


return model
