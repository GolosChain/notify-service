--https://habr.com/company/mailru/blog/334266/
--https://ilovelua.wordpress.com/tag/require/
local notifications = {}
--
local digest = require('digest')
local uuid = require('uuid')
--local validator =  require('authman.validator')
--
notifications.SPACE_NAME = 'notifications'
notifications.PRIMARY_INDEX = 'primary'
notifications.TARGET_INDEX = 'target_index'
--
notifications.ID = 1
notifications.TTIMESTAMP = 2
notifications.TYPE = 3
notifications.TARGET_GOLOS_ID = 4
notifications.TOUCHED = 5
notifications.PAYLOAD = 6
--
function notifications.space()
  return box.space[notifications.SPACE_NAME]
end



function notifications.add(t)
  -- create is registration
  --user_tuple[model.REGISTRATION_TS] = utils.now()
  --
  --local user_id
  --if user_tuple[model.ID] then
  --  user_id = user_tuple[model.ID]
  --else
  --  user_id = uuid.str()
  --end
  --local email = validator.string(user_tuple[model.EMAIL]) and user_tuple[model.EMAIL] or ''
  --return notifications.space():insert{
  --  user_id,
  --  email,
  --  user_tuple[model.TYPE],
  --  user_tuple[model.IS_ACTIVE],
  --  user_tuple[model.PROFILE],
  --  user_tuple[model.REGISTRATION_TS],
  --  user_tuple[model.SESSION_UPDATE_TS],
  --}
  return notifications.space():insert(t)
end



--
return notifications
