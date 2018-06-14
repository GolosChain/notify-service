local api = {}
local notifications = require('api.model.notifications')
local totals = require('api.model.notifications_total')
---------------------------------------------------------------------------- notifications
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

notifications_space:create_index(
  notifications.indexBlock,
  {
    type = 'tree',
    unique = false,
    parts = { notifications.block, 'string' },
    if_not_exists = true
  })

notifications_space:create_index(
  notifications.indexTarget,
  {
    type = 'tree',
    unique = false,
    parts = { notifications.targetId, 'string' },
    if_not_exists = true
  })

notifications_space:create_index(
  notifications.indexTargetType,
  {
    type = 'tree',
    unique = false,
    parts = {
      notifications.targetId, 'string',
      notifications.type, 'string' ,
      notifications.timestamp, 'unsigned'
      },
    if_not_exists = true
  })



notifications_space:create_index(
  notifications.indexTargetTouched,
  {
    type = 'tree',
    unique = false,
    parts = { notifications.targetId, 'string', notifications.touched, 'unsigned' },
    if_not_exists = true
  })
---------------------------------------------------------------------------- totals
local totals_space = box.schema.space.create(
  totals.spaceName,
  { if_not_exists = true })

totals_space:create_index(
  totals.indexPrimary,
  {
    type = 'tree',
    parts = { totals.user_id, 'string' },
    if_not_exists = true
  })



api.notifications = notifications
api.totals = totals

return api
