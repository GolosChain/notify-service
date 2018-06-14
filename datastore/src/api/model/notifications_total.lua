--https://habr.com/company/mailru/blog/334266/
--https://ilovelua.wordpress.com/tag/require/
local model = {}

model.spaceName = 'notifications_total'
model.indexPrimary = 'primary'
--fixme move this to the separate module as it's common
model.user = 1
model.all = 2
model.comment = { 3, "comment" }
model.transfer = { 4, "transfer" }
model.upvote = { 5, "upvote" }
model.downvote = { 6, "downvote" }

function model.count_untouched(user)
  local m = require('api.model.notifications')
  local space = m.get_space()
  local index = space.index[m.indexTargetType]

  local result = {
    [model.user] = user,
    [model.comment[1]] = index:count { user, model.comment[2], 0 },
    [model.transfer[1]] = index:count { user, model.transfer[2], 0 },
    [model.upvote[1]] = index:count { user, model.upvote[2], 0 },
    [model.downvote[1]] = index:count { user, model.downvote[2], 0 },
  }

  result[model.all] = result[model.comment[1]] +
    result[model.transfer[1]] +
    result[model.upvote[1]] +
    result[model.downvote[1]]

  return result

end


function model.reset_untouched(user, type)
  local m = require('api.model.notifications')
  local space = m.get_space()
  local index = space.index[m.indexTargetType]

  for _, tuple in index:pairs(
    {user, type, 0},
    not type and {iterator=box.index.ALL})
  do
    local n = tuple:totable()
    local id = n[1]
    space:update(id, {{'=', m.touched, 1}})
  end

end



--function model.get_space()
--  return box.space[model.spaceName]
--end

--function model.get_by_id(nId)
--  return model.get_space():get(nId)
--end

--function model.update(t)
--  local space = model.get_space()
--  local exists = #space:select { t[model.user_id] } > 0
--  local updated = t
--
--  if exists then
--     updated = space:update(t[model.user_id], {
--      { '+', model.count_all, t[model.count_all] },
--      { '+', model.count_comment, t[model.count_comment] },
--      { '+', model.count_transfer, t[model.count_transfer] },
--      { '+', model.count_upvote, t[model.count_upvote] },
--      { '+', model.count_downvote, t[model.count_downvote] },
--    })
--  else
--    space:insert(t)
--  end
--
--  return updated
--end


return model
