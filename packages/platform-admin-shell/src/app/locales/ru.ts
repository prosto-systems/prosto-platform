import { ru as vuetifyRu } from 'vuetify/locale';
import type { enMessages } from './en';

type LocalizedMessageType<T> = T extends string
  ? string
  : { [K in keyof T]: LocalizedMessageType<T[K]> };

type ApplicationMessagesType = LocalizedMessageType<typeof enMessages>;

export const ruMessages: ApplicationMessagesType = {
  $vuetify: vuetifyRu,
  app: {
    loading: 'Загрузка платформы Prosto...',
  },
  plugins: {
    loadFailed: 'Не удалось загрузить некоторые плагины администрирования:',
    dismiss: 'Закрыть',
  },
  navigation: {
    dashboard: 'Панель управления',
    more: 'Больше',
    less: 'Меньше',
    browse: 'Обзор',
    configuration: 'Конфигурация',
    openNavigation: 'Открыть навигацию',
    toggleNavigationRail: 'Переключить компактную навигацию',
  },
  preferences: {
    language: 'Выбрать язык',
    theme: 'Выбрать тему',
    english: 'English',
    russian: 'Русский',
    light: 'Светлая',
    dark: 'Тёмная',
    system: 'Системная',
  },
  account: {
    signOut: 'Выйти',
    roles: {
      admin: 'Администратор',
      operator: 'Оператор',
      viewer: 'Наблюдатель',
    },
  },
  auth: {
    signIn: 'Войти',
    signInDescription: 'Вход в консоль администрирования платформы Prosto.',
    email: 'Электронная почта',
    password: 'Пароль',
    newPassword: 'Новый пароль',
    confirmNewPassword: 'Подтвердите новый пароль',
    forgotPassword: 'Забыли пароль?',
    backToSignIn: 'Вернуться ко входу',
    loginFailed: 'Не удалось войти. Проверьте данные и повторите попытку.',
    resetPassword: 'Сброс пароля',
    requestResetDescription:
      'Введите адрес электронной почты, чтобы запросить сброс пароля.',
    requestReset: 'Запросить сброс',
    resetRequestAccepted:
      'Если учётная запись с этим адресом существует, инструкции по сбросу пароля отправлены.',
    resetRequestFailed: 'Не удалось выполнить запрос. Повторите попытку.',
    chooseNewPassword: 'Создайте новый пароль',
    invalidResetLink: 'Ссылка для сброса недействительна или неполна.',
    invalidOrExpiredResetLink:
      'Ссылка для сброса недействительна или срок её действия истёк.',
    completeReset: 'Сбросить пароль',
    resetFailed: 'Не удалось сбросить пароль. Запросите новую ссылку.',
  },
  errors: {
    forbiddenTitle: 'Доступ запрещён',
    forbiddenDescription:
      'У вашей учётной записи нет разрешения на просмотр этого ресурса.',
    notFoundTitle: 'Страница не найдена',
    notFoundDescription: 'Запрошенная страница не существует.',
    returnToDashboard: 'Вернуться к панели управления',
    retry: 'Повторить',
  },
  dashboard: {
    operationsConsole: 'Операционная консоль',
    greeting: 'Рады вас видеть, {name}.',
    defaultGreetingName: 'Оператор',
    subtitle:
      'Отслеживайте состояние платформы и координируйте требующие внимания работы.',
    checkingPlatform: 'Проверка платформы',
    statuses: {
      healthy: 'Исправно',
      degraded: 'Снижена производительность',
      maintenance: 'Обслуживание',
    },
    atAGlance: 'Обзор',
    platformSignals: 'Показатели платформы',
    metricsUnavailable: 'Не удалось загрузить метрики.',
    services: 'Сервисы',
    modulesHealthy: 'модулей исправны',
    sessions: 'Сессии',
    activeOperators: 'активных операторов',
    maintenance: 'Обслуживание',
    on: 'Вкл.',
    off: 'Выкл.',
    platformMode: 'режим платформы',
    availability: 'Доступность',
    last24Hours: 'за последние 24 часа',
    serviceHealth: 'Состояние сервисов',
    healthUnavailable: 'Данные о состоянии недоступны.',
    runningModules: 'Запущенные модули',
    online: 'В сети: {count}',
    modulesUnavailable: 'Статус модулей недоступен.',
    module: 'Модуль',
    version: 'Версия',
    status: 'Статус',
    action: 'Действие',
    restart: 'Перезапустить',
    restartModule: 'Перезапустить {name}',
    noModules: 'Сейчас нет зарегистрированных модулей.',
    recentActivity: 'Последняя активность',
    activityUnavailable: 'Данные об активности недоступны.',
    noActivity: 'Активность пока не зафиксирована.',
    authorizedOperations: 'Разрешённые операции',
    platformControls: 'Управление платформой',
    operationsDescription:
      'Изменения применяются сразу и фиксируются в активности.',
    maintenanceMode: 'Режим обслуживания',
    restartPlatform: 'Перезапустить платформу',
    operationFailed:
      'Не удалось выполнить операцию. Проверьте права и повторите попытку.',
    moduleRestartQueued: 'Перезапуск модуля добавлен в очередь.',
    platformRestartQueued: 'Перезапуск платформы добавлен в очередь.',
    maintenanceEnabled: 'Режим обслуживания включён.',
    maintenanceDisabled: 'Режим обслуживания выключен.',
  },
  mock: {
    accounts: 'Тестовые учётные записи для разработки',
    useAccount: 'Использовать: {role}',
    resetLink: 'Открыть детерминированную ссылку сброса',
  },
};
