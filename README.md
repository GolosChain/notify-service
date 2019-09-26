# NOTIFY-SERVICE

**NOTIFY-SERVICE** является сервисом рассылки уведомлений для CyberWay.
Сервис извлекает из блокчейна необходимые данные, определяет произошедшие события и группирует их,
сохраняя в базе данных.
Историю можно выгрузить по запросу, указав тип интересуемого события.
Если пользователь онлайн - он получает уведомления в реальном времени через связанный сервис ONLINE-NOTIFY-SERVICE.
Также происходят уведомления через push для пользователей мобильных устройств и web-push для браузеров, используется PUSH-SERVICE.
Данные хранятся ограниченное время, после чего удаляются из базы данных.

##### API JSON-RPC

```
history:                                // Получение истории пользователя
    fromId <number>(null)               // ID последнего события после которого формировать выдачу, если нужно
    limit <number>(10) [1..100]         // Количество событий, которое нужно получить
    markAsViewed <boolean>(true)        // Пометить полученные эвенты как уже просмотренные.
    freshOnly <boolean>                 // Вернуть ли только не прочитанные
    user <string>                       // Идентификатор пользователя
    app <string>('cyber')               // Тип приложения / домена
        [
          cyber                         // CyberWay
        | gls                           // Golos
        ]
    types
    <'all'|[string(eventType)]>('all')  // Массив типов необходимых событий или строка 'all' для всех сразу
         [
           upvote                       // лайк (голос)
         | downvote                     // дизлайк
         | transfer                     // перевод средств
         | reply                        // ответ на пост или комментарий
         | subscribe                    // подписка на блог
         | unsubscribe                  // отписка от блога
         | mention                      // упоминание в посте, заголовке поста или в комменте (через @)
         | repost                       // репост
         | reward                       // награда пользователю
         | curatorReward                // награда куратору
         | benefeciaryReward            // награда бенефициару
         | witnessVote                  // голос за делегата
         | witnessCancelVote            // отмена голоса за делегата
         ]

historyFresh:              // Возвращает количество непрочитанных уведомлений из истории уведомлений
    user <string>          // Идентификатор пользователя
    app <string>('cyber')  // Тип приложения / домена
        [
          cyber            // CyberWay
        | gls              // Golos
        ]

markAsViewed:              // Помечает указанные эвенты пользователя как прочитанные
    user <string>          // Идентификатор пользователя
    app <string>('cyber')  // Тип приложения / домена
        [
          cyber            // CyberWay
        | gls              // Golos
        ]
    ids <[string]>         // Массив ID эвентов.


markAllAsViewed:           // Помечает все эвенты пользователя как прочитанные
    user <string>          // Идентификатор пользователя
    app <string>('cyber')  // Тип приложения / домена
        [
          cyber            // CyberWay
        | gls              // Golos
        ]

getBlackList:              // Возвращает черный список пользователя
    owner <string>         // Имя пользователя-инициатора

addToBlackList:            // Добавляет пользователя в черный список
    owner <string>         // Имя пользователя-инициатора
    banned <string>        // Имя пользователя для добавления

removeFromBlackList:       // Исключает пользователя из черного списка
    owner <string>         // Имя пользователя-инициатора
    banned <string>        // Имя пользователя для исключения
```

##### Формат данных

```
// Общий вид ответа

total <number>                          // Общее число хранимых эвентов
totalByTypes <{string(type): number}>   // Число хранимых эвентов по типу
                                        // Также содержит summary - сумму всех полей
fresh <number>                          // Общее число непросмотренных эвентов
freshByTypes <{string(type): number}>   // Число непросмотренных эвентов по типу
                                        // Также содержит summary - сумму всех полей
unread <number>                         // Общее число непрочитанных эвентов
unreadByTypes <{string(type): number}>  // Число непрочитанных эвентов по типу
                                        // Также содержит summary - сумму всех полей
data: <[object]>                        // Данные эвентов в виде массива объектов
    eventType <string>                  // Тип эвента
    fresh <boolean>                     // Пометка того является ли эвент непросмотренным
    unread <boolean>                    // Пометка того является ли эвент непрочитанным
    ...data                             // Данные, относящиеся к конкретному эвенту
```

##### Возможные переменные окружения `ENV`

-   `GLS_ONLINE_NOTIFY_CONNECT` _(обязательно)_ - адрес подключения к микросервису онлайн нотификаций.

-   `GLS_PUSH_CONNECT` _(обязательно)_ - адрес подключения к микросервису рассылки push-уведомлений.

-   `GLS_PRISM_CONNECT` _(обязательно)_ - адрес подключения к микросервису призмы в обычном режиме.

-   `GLS_PRISM_API_CONNECT` - адрес подключения к микросервису призмы в API режиме. (Если не задано то берется `GLS_PRISM_CONNECT`).

-   `GLS_DISABLE_PUSH` - отключить отсылку push'ей.

-   `EVENT_EXPIRATION` - время в миллисекундах, после которого эвент будет удален из истории.  
    Дефолтное значение - `1000 * 60 * 60 * 24 * 30` (1 месяц)

-   `GLS_GATE_HOST` _(обязательно)_ - адрес, который будет использован для входящих подключений связи микросервисов.  
    Дефолтное значение при запуске без докера - `127.0.0.1`

-   `GLS_GATE_PORT` _(обязательно)_ - адрес порта, который будет использован для входящих подключений связи микросервисов.  
    Дефолтное значение при запуске без докера - `3000`

-   `GLS_METRICS_HOST` _(обязательно)_ - адрес хоста для метрик StatsD.  
    Дефолтное значение при запуске без докера - `127.0.0.1`
-   `GLS_METRICS_PORT` _(обязательно)_ - адрес порта для метрик StatsD.  
    Дефолтное значение при запуске без докера - `8125`

-   `GLS_MONGO_CONNECT` - строка подключения к базе MongoDB.  
    Дефолтное значение - `mongodb://mongo/admin`

-   `GLS_DAY_START` - время начала нового дня в часах относительно UTC, используется для таких вещей как валидация "1 пост в сутки".  
    Дефолтное значение - `3` (день начинается в 00:00 по Москве).

-   `GLS_BLOCKCHAIN_BROADCASTER_SERVER_NAME` - имя сервера рассыльщика блоков.

-   `GLS_BLOCKCHAIN_BROADCASTER_CLIENT_NAME` - имя клиента для подключения к рассыльщику блоков.

-   `GLS_BLOCKCHAIN_BROADCASTER_CONNECT` - строка подключения к рассыльщику блоков, может содержать авторизацию.

-   `GLS_MAX_NOTIFICATION_DELAY` _(по умолчанию 10800000 = 3ч.)_ - максимальная задержка при отправки нотификации относительно времени самого события.

##### Запуск

Для запуска сервиса достаточно вызвать команду `docker-compose up --build` в корне проекта, предварительно указав
необходимые `ENV` переменные.

##### Примечания

-   В случае удаления поста/комментария - он будет удален и из истории нотификаций, однако оповещение удаления не рассылается.
-   В случае снятия голоса или флага (значение голоса выставляется в 0) оповещение не рассылается.
