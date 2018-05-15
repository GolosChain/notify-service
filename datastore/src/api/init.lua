local api = {}
local notifications = require('api.model.notifications')

local notifications_space = box.schema.space.create(
  notifications.spaceName,
  { if_not_exists = true })

notifications_space:create_index(
  notifications.indexPrimary,
  {
    type = 'hash',
    parts = { notifications.id, 'string' },
    if_not_exists = true
  })
--user_space:create_index(user.EMAIL_INDEX, {
--  type = 'tree',
--  unique = false,
--  parts = {user.EMAIL, 'string', user.TYPE, 'unsigned'},
--  if_not_exists = true
--})



api.notifications = notifications
return api
