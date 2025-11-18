# @makebelieve21213-packages/logger

Универсальный пакет логирования для микросервисов NestJS на базе Winston с поддержкой записи логов в файлы с ротацией и опциональной отправкой в Logstash.

## 🎯 Возможности

- ✅ **Расширяет стандартный NestJS Logger** - полная совместимость с экосистемой NestJS
- ✅ **Winston под капотом** - мощный и гибкий логгер для Node.js
- ✅ **Цветной вывод в консоль** - разные цвета для разных уровней логирования
- ✅ **Автоматическая запись в файлы** - все логи (кроме debug) сохраняются в JSON формате
- ✅ **Ротация файлов** - автоматическое создание новых файлов каждый день или по размеру
- ✅ **Разделение по микросервисам** - каждый сервис пишет в свою директорию
- ✅ **Кастомная директория логов** - поддержка абсолютных и относительных путей
- ✅ **Интеграция с Logstash** - опциональная отправка логов через TCP
- ✅ **Transient scope** - каждый сервис получает свой экземпляр с контекстом
- ✅ **100% покрытие тестами** - надежность и стабильность
- ✅ **TypeScript** - полная типизация

## 📦 Установка

```bash
pnpm add @makebelieve21213-packages/logger
```

Или добавьте в `package.json` вашего микросервиса:
```json
{
  "dependencies": {
    "@makebelieve21213-packages/logger": "workspace:*"
  }
}
```

## 🚀 Быстрый старт

### 1. Подключение в AppModule

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from '@makebelieve21213-packages/logger';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRootAsync<[ConfigService]>({
      useFactory: (configService: ConfigService) => ({
        serviceName: configService.get('SERVICE_NAME') || 'unknown-service',
        maxFiles: configService.get('LOGGER_MAX_FILES') || 30,
        maxLinesPerFile: configService.get('LOGGER_MAX_LINES_PER_FILE') || 10000,
        logstashHost: configService.get('LOGSTASH_HOST'),
        logstashPort: configService.get('LOGSTASH_PORT') 
          ? parseInt(configService.get('LOGSTASH_PORT')) 
          : undefined,
        logDir: configService.get('LOGGER_LOG_DIR'), // Опционально
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### 2. Использование в сервисах

```typescript
import { Injectable } from '@nestjs/common';
import LoggerService from '@makebelieve21213-packages/logger';

@Injectable()
export default class UserService {
  constructor(
    private readonly logger: LoggerService
  ) {
    this.logger.setContext('UserService');
  }

  async createUser(userData: CreateUserDto): Promise<User> {
    this.logger.log('Creating new user');
    
    try {
      const user = await this.userRepository.save(userData);
      this.logger.log(`User created successfully: ${user.id}`);
      return user;
    } catch (error) {
      this.logger.error(
        `Failed to create user: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  async getUserById(id: string): Promise<User> {
    this.logger.debug(`Fetching user by ID: ${id}`); // Только в консоль
    
    const user = await this.userRepository.findById(id);
    
    if (!user) {
      this.logger.warn(`User not found: ${id}`);
      throw new NotFoundException('User not found');
    }
    
    return user;
  }
}
```

### 3. Использование в main.ts

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import LoggerService from '@makebelieve21213-packages/logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Использовать наш логгер для всего приложения
  const logger = app.get(LoggerService);
  logger.setContext('Bootstrap');
  app.useLogger(logger);

  await app.listen(3000);
  logger.log('Application is running on: http://localhost:3000');
}

bootstrap();
```

## 📊 Методы логирования

### `log(message: string, context?: string): void`
Обычный информационный лог. Выводится в консоль (зеленый цвет) и записывается в файл.

```typescript
this.logger.log('Server started successfully');
this.logger.log('Request processed', 'HttpController');
```

### `error(message: string, trace?: string, context?: string): void`
Лог ошибки. Выводится в консоль (красный цвет), записывается в файл и **отправляется в Logstash** (если настроен).

```typescript
this.logger.error('Database connection failed', error.stack);
this.logger.error('Payment failed', error.stack, 'PaymentService');
```

### `warn(message: string, context?: string): void`
Предупреждение. Выводится в консоль (желтый цвет) и записывается в файл.

```typescript
this.logger.warn('API rate limit approaching');
this.logger.warn('Cache miss', 'CacheService');
```

### `debug(message: string, context?: string): void`
Отладочный лог. **Только выводится в консоль** (голубой цвет), НЕ записывается в файл.

```typescript
this.logger.debug('Processing request data');
this.logger.debug('Cache hit', 'CacheService');
```

### `verbose(message: string, context?: string): void`
Алиас для метода `log()`. Для совместимости с NestJS LoggerService.

```typescript
this.logger.verbose('Detailed operation info');
```

### `setContext(context: string): void`
Устанавливает контекст для всех последующих логов.

```typescript
constructor(private readonly logger: LoggerService) {
  this.logger.setContext('MyService');
}
```

## 📁 Структура пакета

```
packages-packages/logger/
├── src/
│   ├── configs/
│   │   ├── __tests__/
│   │   │   └── winston.config.spec.ts    # Тесты конфигурации Winston
│   │   └── winston.config.ts             # Конфигурация Winston транспортов
│   ├── errors/
│   │   ├── __tests__/
│   │   │   └── logger.error.spec.ts     # Тесты LoggerError
│   │   └── logger.error.ts               # Кастомная ошибка
│   ├── interfaces/
│   │   └── logger.interface.ts           # Интерфейс Logger
│   ├── main/
│   │   ├── __tests__/
│   │   │   ├── logger.service.spec.ts    # Тесты сервиса
│   │   │   └── logger.module.spec.ts     # Тесты модуля
│   │   ├── logger.module.ts              # NestJS модуль (Global)
│   │   └── logger.service.ts             # Сервис логирования (Transient)
│   ├── types/
│   │   └── logger.types.ts               # TypeScript типы
│   ├── utils/
│   │   ├── __tests__/
│   │   │   └── constants.spec.ts         # Тесты утилит
│   │   ├── constants.ts                  # Константы
│   │   ├── directory.ts                  # Утилиты для директорий
│   │   └── formatters.ts                 # Форматтеры
│   └── index.ts                          # Экспорты пакета
├── dist/                                 # Скомпилированный код
└── logs/                                 # Логи (создаются автоматически)
```

## 📁 Структура файлов логов

По умолчанию логи создаются в директории `process.cwd()/logs/{serviceName}/`.

Можно указать кастомную директорию через `logDir` в конфигурации:
- **Абсолютный путь**: используется как есть
- **Относительный путь**: разрешается относительно `process.cwd()`

Пример структуры:

```
logs/                                    # Или кастомная директория
├── api-service/                         # Подпапка с именем сервиса
│   ├── 2024-01-15.log                  # Все логи за день в одном файле
│   └── 2024-01-16.log
└── dashboard-service/
    ├── 2024-01-15.log
    └── 2024-01-16.log
```

**Путь по умолчанию**: `process.cwd()/logs/{serviceName}/{YYYY-MM-DD}.log`

### Формат лога в файле (JSON)

```json
{
  "timestamp": "2024-01-15 10:30:45",
  "level": "error",
  "service": "api-service",
  "context": "UserService",
  "message": "Failed to create user",
  "trace": "Error: Validation failed\n    at UserService.create..."
}
```

## 🔄 Ротация логов

- **По размеру**: Новый файл создается каждые `maxLinesPerFile` строк (по умолчанию 10,000)
- **По дате**: Каждый день создается новый файл с датой в имени
- **Автоочистка**: Старые файлы удаляются через `maxFiles` дней (по умолчанию 30)

## 📈 Интеграция с Logstash

При указании `logstashHost` и `logstashPort` в конфигурации, все логи уровня **error** автоматически отправляются в Logstash через TCP для централизованного мониторинга и алертинга.

### Настройка Logstash

1. Запустите Logstash (например, через Docker):

```bash
docker run -d --name=logstash -p 5000:5000 logstash/logstash:latest
```

2. Настройте конфигурацию:

```typescript
LoggerModule.forRootAsync({
  useFactory: () => ({
    serviceName: 'api-service',
    logstashHost: 'localhost',
    logstashPort: 5000,
  }),
})
```

## 🧪 Тестирование

Пакет имеет 100% покрытие тестами:

```bash
cd packages-packages/logger
pnpm test
pnpm test:coverage
```

### Моки для тестирования

```typescript
import { Test } from '@nestjs/testing';
import LoggerService from '@makebelieve21213-packages/logger';

const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  setContext: jest.fn(),
};

const module = await Test.createTestingModule({
  providers: [
    MyService,
    {
      provide: LoggerService,
      useValue: mockLogger,
    },
  ],
}).compile();
```

## ⚙️ Конфигурация

### LoggerConfig

```typescript
interface LoggerConfig {
  serviceName: string;              // Обязательно: имя микросервиса
  maxFiles?: number;                // Опционально: дней хранения (по умолчанию 30)
  maxLinesPerFile?: number;         // Опционально: строк в файле (по умолчанию 10000)
  logstashHost?: string;            // Опционально: хост Logstash
  logstashPort?: number;            // Опционально: порт Logstash
  logDir?: string;                  // Опционально: директория для логов
}
```

### Типы TypeScript

```typescript
interface Logger extends NestLoggerService {
  log(message: string, context?: string): void;
  error(message: string, trace?: string, context?: string): void;
  warn(message: string, context?: string): void;
  debug(message: string, context?: string): void;
  verbose(message: string, context?: string): void;
  setContext(context: string): void;
}
```

## 🏗️ Разработка

```bash
# Установка зависимостей
pnpm install

# Сборка
pnpm build

# Запуск тестов
pnpm test

# Запуск тестов с покрытием
pnpm test:coverage

# Линтер
pnpm lint
pnpm lint:fix

# Форматирование
pnpm format
pnpm format:fix
```

## 🐳 Развертывание в Docker локально

### Сборка образа

Соберите Docker образ из корня проекта:

```bash
docker build -t logger-package:latest .
```

### Запуск контейнера

#### Базовый запуск

```bash
docker run -d \
  --name logger-package \
  logger-package:latest
```

#### С монтированием директории логов

Чтобы логи сохранялись на хосте:

```bash
docker run -d \
  --name logger-package \
  -v $(pwd)/logs:/app/logs \
  logger-package:latest
```

#### С переменными окружения

```bash
docker run -d \
  --name logger-package \
  -v $(pwd)/logs:/app/logs \
  -e SERVICE_NAME=logger-service \
  -e LOGGER_MAX_FILES=30 \
  -e LOGGER_MAX_LINES_PER_FILE=10000 \
  -e LOGSTASH_HOST=localhost \
  -e LOGSTASH_PORT=5000 \
  logger-package:latest
```

#### С кастомной директорией логов

```bash
docker run -d \
  --name logger-package \
  -v /var/log/myapp:/app/logs \
  -e LOGGER_LOG_DIR=/app/logs \
  logger-package:latest
```

### Просмотр логов контейнера

```bash
# Логи контейнера (stdout/stderr)
docker logs logger-package

# Следить за логами в реальном времени
docker logs -f logger-package

# Логи из файлов (если смонтирована директория)
tail -f logs-packages/logger-service/$(date +%Y-%m-%d).log
```

### Остановка и удаление

```bash
# Остановка контейнера
docker stop logger-package

# Удаление контейнера
docker rm logger-package

# Остановка и удаление одной командой
docker rm -f logger-package
```

### Использование docker-compose

Создайте файл `docker-compose.yml`:

```yaml
version: '3.8'

services:
  logger:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: logger-package
    volumes:
      - ./logs:/app/logs
    environment:
      - SERVICE_NAME=logger-service
      - LOGGER_MAX_FILES=30
      - LOGGER_MAX_LINES_PER_FILE=10000
      - LOGSTASH_HOST=logstash
      - LOGSTASH_PORT=5000
      - LOGGER_LOG_DIR=/app/logs
    networks:
      - logger-network
    restart: unless-stopped

  logstash:
    image: logstash/logstash:latest
    container_name: logstash
    ports:
      - "5000:5000"
    volumes:
      - ./logstash-config:/usr/share/logstash/config
    networks:
      - logger-network
    restart: unless-stopped

networks:
  logger-network:
    driver: bridge
```

Запуск:

```bash
# Запуск всех сервисов
docker-compose up -d

# Просмотр логов
docker-compose logs -f logger

# Остановка
docker-compose down
```

### Особенности работы в Docker

1. **Директория логов**: По умолчанию логи создаются в `/app/logs` внутри контейнера. Для сохранения на хосте используйте volume mount.

2. **Права доступа**: Образ использует пользователя `nodejs` (UID 1001) для безопасности. Убедитесь, что смонтированная директория имеет правильные права:

```bash
sudo chown -R 1001:1001 logs/
```

3. **Переменные окружения**: Все настройки можно передать через переменные окружения, которые затем используются в `ConfigService`.

4. **Multi-stage build**: Dockerfile использует multi-stage build для оптимизации размера образа. Production образ содержит только необходимые зависимости.

## 🔑 Ключевые особенности реализации

### Transient Scope
LoggerService использует `Scope.TRANSIENT`, что означает:
- Каждый сервис получает **свой экземпляр** логгера
- Можно устанавливать контекст индивидуально для каждого сервиса
- Winston logger создается внутри каждого экземпляра

### Global Module
LoggerModule помечен как `@Global()`:
- Регистрируется **один раз** в AppModule
- Доступен во **всех модулях** без повторного импорта
- Конфигурация передается через `forRootAsync()`

### Уровни логирования
- **error** → консоль (красный) + файл + Logstash (если настроен)
- **warn** → консоль (желтый) + файл
- **log** (info) → консоль (зеленый) + файл
- **debug** → только консоль (голубой), НЕ в файл
- **verbose** → alias для `log` (совместимость)

### Инициализация
- `onModuleInit()` автоматически вызывается NestJS при инициализации модуля
- Создает Winston logger с настроенными транспортами
- Если использовать logger до инициализации → выбрасывается `LoggerError`

### Graceful Shutdown
- `onModuleDestroy()` автоматически вызывается NestJS при остановке приложения
- Закрывает все транспорты Winston (TCP соединения, файловые дескрипторы)
- Важно для корректного завершения работы приложения

## 📝 Лицензия

MIT License - см. файл [LICENSE](LICENSE) для деталей.

## 🤝 Contribution

Pull requests приветствуются! Для крупных изменений, пожалуйста, сначала откройте issue для обсуждения.

Подробные инструкции по внесению вклада см. в [CONTRIBUTING.md](CONTRIBUTING.md).

## 📌 Примеры использования

### С кастомной директорией логов

```typescript
LoggerModule.forRootAsync({
  useFactory: () => ({
    serviceName: 'api-service',
    logDir: '/var/log/myapp', // Абсолютный путь
  }),
})
```

### С относительным путем

```typescript
LoggerModule.forRootAsync({
  useFactory: () => ({
    serviceName: 'api-service',
    logDir: './custom-logs', // Относительно process.cwd()
  }),
})
```

### С Logstash

```typescript
LoggerModule.forRootAsync({
  useFactory: () => ({
    serviceName: 'api-service',
    logstashHost: 'localhost',
    logstashPort: 5000,
  }),
})
```

## ❓ Частые вопросы

### Почему debug логи не записываются в файл?
Debug логи предназначены для отладки и могут быть очень частыми. Чтобы не создавать лишнюю нагрузку на файловую систему, они выводятся только в консоль.

### Как изменить директорию логов?
Используйте параметр `logDir` в конфигурации. Можно указать абсолютный или относительный путь.

### Как отключить запись в файлы?
В текущей версии это не поддерживается. Все логи уровня info и выше всегда записываются в файл. Если нужна только консоль, можно использовать только debug логи.

### Почему используется Transient scope?
Чтобы каждый сервис мог иметь свой контекст логирования. Это позволяет легко отслеживать, из какого сервиса пришел лог.

### Как работает ротация файлов?
Файлы ротируются по двум критериям:
1. По дате - каждый день создается новый файл
2. По размеру - если файл превышает `maxLinesPerFile` строк, создается новый файл

Старые файлы автоматически удаляются через `maxFiles` дней.
