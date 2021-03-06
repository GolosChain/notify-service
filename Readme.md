# NOTIFY-SERVICE

**NOTIFY-SERVICE** является сервисом рассылки уведомлений для [golos.io](https://golos.io) и приложений.
Сервис извлекает из блокчейна необходимые данные, определяет произошедшие события и группирует их,
сохраняя в базе данных.
Историю можно выгрузить по запросу, указав тип интересуемого события.
Если пользователь онлайн - он получает уведомления в реальном времени через связанный сервис ONLINE-NOTIFY-SERVICE.
Также происходят уведомления через push для пользователей мобильных устройств и web-push для браузеров, используется PUSH-SERVICE.
Данные хранятся ограниченное время, после чего удаляются из базы данных.

##### API JSON-RPC

 ```
 history:                                      // Получение истории пользователя
     fromId <number>(null)                     // ID последнего события после которого формировать выдачу, если нужно
     limit <number>(10) [1..100]               // Количество событий, которое нужно получить
     markAsViewed <boolean>(true)              // Пометить полученные эвенты как уже просмотренные. 
     types <'all'|[string(eventType)]>('all')  // Массив типов необходимых событий или строка 'all' для всех сразу
          [
            vote               // лайк (голос)
          | flag               // флаг (дизлайк, жалоба)
          | transfer           // перевод средств
          | reply              // ответ на пост или комментарий
          | subscribe          // подписка на блог
          | unsubscribe        // отписка от блога
          | mention            // упоминание в посте, заголовке поста или в комменте (через @)
          | repost             // репост
          | reward             // награда пользователю 
          | curatorReward      // награда куратору     
          | message            // личное сообщение     (не реализованно в данной версии)
          | witnessVote        // голос за делегата
          | witnessCancelVote  // отмена голоса за делегата
          ]   
              
 historyFresh:        // Возвращает количество непрочитанных уведомлений из истории уведомлений
     <empty>
     
 markAsViewed:        // Помечает указанные эвенты пользователя как прочитанные
     ids <[string]>   // Массив ID эвентов.
 
 markAllAsViewed:     // Помечает все эвенты пользователя как прочитанные
     <empty>   
     
 getBlackList:         // Возвращает черный список пользователя
     owner <string>    // Имя пользователя-инициатора 
     
 addToBlackList:       // Добавляет пользователя в черный список
     owner <string>    // Имя пользователя-инициатора
     banned <string>   // Имя пользователя для добавления
 
 removeFromBlackList:  // Исключает пользователя из черного списка                   
     owner <string>    // Имя пользователя-инициатора
     banned <string>   // Имя пользователя для исключения
 ```

##### Формат данных

 ```
 // Общий вид ответа

 total <number>                         // Общее число хранимых эвентов
 totalByTypes <{string(type): number}>  // Число хранимых эвентов по типу
                                        // Также содержит summary - сумму всех полей
 fresh <number>                         // Общее число непросмотренных эвентов
 freshByTypes <{string(type): number}>  // Число непросмотренных эвентов по типу
                                        // Также содержит summary - сумму всех полей
 data: <[object]>                       // Данные эвентов в виде массива объектов

 // Общий вид данных эвента

 eventType <string>  // Тип эвента
 fresh <boolean>     // Пометка того является ли эвент не просмотренным
 counter <number>    // Значение группировки, указывает на сквошинг эвентов в один эвент
 (concrete data)     // Данные, относящиеся к конкретному эвенту (смотри ниже)

 // Формат каждого конкретного типа эвента

 vote:                        // лайк (голос)
     permlink <string>        // ссылка на целевой пост/комментарий
     fromUsers <[string]>     // юзеры-источники эвента

 flag:                        // флаг (дизлайк, жалоба)
     permlink <string>        // ссылка на целевой пост/комментарий
     fromUsers <[string]>     // юзеры-источники эвента

 transfer:                    // перевод средств
     fromUsers <[string]>     // юзеры-источники эвента
     amount <string>          // количество и тип токенов через пробел

 reply:                       // ответ на пост или комментарий
     permlink <string>        // ссылка на целевой пост/комментарий
     parentPermlink <string>  // родительский пост/комментарий целевого поста/комментария
     fromUsers <[string]>     // юзеры-источники эвента

 subscribe:                   // подписка на блог
     fromUsers <[string]>     // юзеры-источники эвента

 unsubscribe:                 // отписка от блога
     fromUsers <[string]>     // юзеры-источники эвента

 mention:                     // упоминание в посте, заголовке поста или в комменте (через @)
     permlink <string>        // ссылка на целевой пост/комментарий
     parentPermlink <string>  // родительский пост целевого поста/комментария
     fromUsers <[string]>     // юзеры-источники эвента

 repost:                      // репост
     permlink <string>        // ссылка на целевой пост
     fromUsers <[string]>     // юзеры-источники эвента

 reward:                      // награда пользователю
     permlink <string>        // ссылка на целевой пост/коммент
     reward: <object>         // награда
         golos <number>       // в голосах
         golosPower <number>  // в силе голоса
         gbg <number>         // в голос/золоте
  
 curatorReward:                    // награда куратору
     permlink <string>             // ссылка на целевой пост/коммент
     curatorReward <number>        // награда в силе голоса
     curatorTargetAuthor <string>  // автор поста/коммента, за который получена награда

 message:                     // личное сообщение
     fromUsers <[string]>     // юзеры-источники эвента
                    
 witnessVote:                 // голос за делегата
     fromUsers <[string]>     // юзеры-источники эвента

 witnessCancelVote:           // отмена голоса за делегата
     fromUsers <[string]>     // юзеры-источники эвента
 ```

##### Возможные переменные окружения `ENV`
  
  - `GLS_ONLINE_NOTIFY_CONNECT` *(обязательно)* - адрес подключения к микросервису онлайн нотификаций.

  - `GLS_PUSH_CONNECT` *(обязательно)* - адрес подключения к микросервису рассылки push-уведомлений.
    
  - `EVENT_EXPIRATION` - время в миллисекундах, после которого эвент будет удален из истории.  
   Дефолтное значение - `1000 * 60 * 60 * 24 * 30` (1 месяц) 
  
  - `GLS_GATE_HOST` *(обязательно)* - адрес, который будет использован для входящих подключений связи микросервисов.  
   Дефолтное значение при запуске без докера - `127.0.0.1`
  
  - `GLS_GATE_PORT` *(обязательно)* - адрес порта, который будет использован для входящих подключений связи микросервисов.  
   Дефолтное значение при запуске без докера - `3000`
  
  - `GLS_METRICS_HOST` *(обязательно)* - адрес хоста для метрик StatsD.  
   Дефолтное значение при запуске без докера - `127.0.0.1`
        
  - `GLS_METRICS_PORT` *(обязательно)* - адрес порта для метрик StatsD.  
   Дефолтное значение при запуске без докера - `8125`
  
  - `GLS_MONGO_CONNECT` - строка подключения к базе MongoDB.  
   Дефолтное значение - `mongodb://mongo/admin`
  
  - `GLS_DAY_START` - время начала нового дня в часах относительно UTC, используется для таких вещей как валидация "1 пост в сутки".    
   Дефолтное значение - `3` (день начинается в 00:00 по Москве). 
  
  - `GLS_BLOCKCHAIN_SUBSCRIBE_TIMEOUT` - таймаут подписки на новые блоки, срабатывает если за это время от блокчейн-ноды не пришло ни единого блока.  
   Дефолтное значение - `60000`, что равно одной минуте.
       
  - `GLS_BLOCKCHAIN_CONNECT` - адрес блокчейн-ноды для прослушивания.  
   Дефолтное значение - `wss://ws.golos.io`
 
##### Запуск 
 
Для запуска сервиса достаточно вызвать команду `docker-compose up` в корне проекта, предварительно указав
необходимые `ENV` переменные. 

##### Примечания
- В случае удаления поста/комментария - он будет удален и из истории нотификаций, однако оповещение удаления не рассылается.
- В случае снятия голоса или флага (значение голоса выставляется в 0) оповещение не рассылается.
