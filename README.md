# @makebelieve21213-packages/logger

Универсальный пакет логирования для микросервисов NestJS на базе Winston с поддержкой записи логов в файлы с ротацией и опциональной отправкой в Logstash.

## 📋 Содержание

- [Возможности](#-возможности)
- [Требования](#-требования)
- [Установка](#-установка)
- [Структура пакета](#-структура-пакета)
- [Быстрый старт](#-быстрый-старт)
- [Использование](#-использование)
- [API Reference](#-api-reference)
- [Конфигурация](#-конфигурация)
- [Тестирование](#-тестирование)

## 🚀 Возможности

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

## 📋 Требования

- **Node.js**: >= 22.11.0
- **NestJS**: >= 11.0.0

## 📦 Установка

```bash
npm install @makebelieve21213-packages/logger
```

### Зависимости

Пакет требует следующие peer dependencies:

```json
{
  "@nestjs/common": "^11.0.0",
  "reflect-metadata": "^0.1.13 || ^0.2.0",
  "rxjs": "^7.0.0"
}
```

## 📁 Структура пакета

```
src/
├── configs/                              # Конфигурация Winston
│   ├── __tests__/
│   │   └── winston.config.spec.ts        # Тесты конфигурации Winston
│   └── winston.config.ts                 # Конфигурация Winston транспортов
│
├── errors/                               # Кастомные ошибки
│   ├── __tests__/
│   │   └── logger.error.spec.ts          # Тесты LoggerError
│   └── logger.error.ts                   # LoggerError
│
├── interfaces/                           # TypeScript интерфейсы
│   └── logger.interface.ts               # Интерфейс Logger (расширяет NestJS)
│
├── main/                                 # NestJS модули
│   ├── __tests__/
│   │   ├── logger.module.spec.ts         # Тесты модуля
│   │   └── logger.service.spec.ts        # Тесты сервиса
│   ├── logger.module.ts                  # LoggerModule (Global)
│   └── logger.service.ts                 # LoggerService (Transient)
│
├── types/                                # TypeScript типы
│   ├── logger.types.ts                   # Типы и интерфейсы конфигурации
│   └── winston-logstash.d.ts             # Типы для winston-logstash
│
├── utils/                                # Утилиты
│   ├── __tests__/
│   │   └── constants.spec.ts             # Тесты утилит
│   ├── constants.ts                      # Константы
│   ├── directory.ts                      # Утилиты для работы с директориями
│   └── formatters.ts                     # Форматтеры для консоли и файлов
│
└── index.ts                              # Точка входа (экспорты)
```

## 🔧 Быстрый старт

### Шаг 1: Подключение в AppModule

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

### Шаг 2: Использование в сервисах

```typescript
import { Injectable } from '@nestjs/common';
import LoggerService from '@makebelieve21213-packages/logger';

@Injectable()
export default class UserService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('UserService');
  }

  async createUser(userData: CreateUserDto): Promise<User> {
    this.logger.log('Creating new user');

    try {
      const user = await this.userRepository.save(userData);
      this.logger.log(`User created successfully: ${user.id}`);
      return user;
    } catch (error) {
      this.logger.error(`Failed to create user: ${error.message}`, error.stack);
      throw error;
    }
  }
}
```

### Шаг 3: Использование в main.ts

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import LoggerService from '@makebelieve21213-packages/logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(LoggerService);
  logger.setContext('Bootstrap');
  app.useLogger(logger);

  await app.listen(3000);
  logger.log('Application is running on: http://localhost:3000');
}

bootstrap();
```

## 📚 Использование

### LoggerService

**Методы:**

#### `log(message: string, context?: string): void`

Обычный информационный лог. Выводится в консоль (зеленый цвет) и записывается в файл.

```typescript
this.logger.log('Server started successfully');
this.logger.log('Request processed', 'HttpController');
```

#### `error(message: string, trace?: string, context?: string): void`

Лог ошибки. Выводится в консоль (красный цвет), записывается в файл и **отправляется в Logstash** (если настроен).

```typescript
this.logger.error('Database connection failed', error.stack);
this.logger.error('Payment failed', error.stack, 'PaymentService');
```

#### `warn(message: string, context?: string): void`

Предупреждение. Выводится в консоль (желтый цвет) и записывается в файл.

```typescript
this.logger.warn('API rate limit approaching');
this.logger.warn('Cache miss', 'CacheService');
```

#### `debug(message: string, context?: string): void`

Отладочный лог. **Только выводится в консоль** (голубой цвет), НЕ записывается в файл.

```typescript
this.logger.debug('Processing request data');
this.logger.debug('Cache hit', 'CacheService');
```

#### `verbose(message: string, context?: string): void`

Алиас для метода `log()`. Для совместимости с NestJS LoggerService.

```typescript
this.logger.verbose('Detailed operation info');
```

#### `setContext(context: string): void`

Устанавливает контекст для всех последующих логов.

```typescript
constructor(private readonly logger: LoggerService) {
  this.logger.setContext('MyService');
}
```

## ⚙️ Конфигурация

### LoggerConfig

```typescript
interface LoggerConfig {
  serviceName: string;               // Обязательно: имя микросервиса
  maxFiles?: number;                 // Опционально: дней хранения (по умолчанию 30)
  maxLinesPerFile?: number;          // Опционально: строк в файле (по умолчанию 10000)
  logstashHost?: string;             // Опционально: хост Logstash
  logstashPort?: number;             // Опционально: порт Logstash
  logDir?: string;                   // Опционально: директория для логов
}
```

### Структура файлов логов

По умолчанию логи создаются в директории `process.cwd()/logs/{serviceName}/`.

Можно указать кастомную директорию через `logDir`:
- **Абсолютный путь**: используется как есть
- **Относительный путь**: разрешается относительно `process.cwd()`

Пример структуры:

```
logs/
├── api-service/
│   ├── 2024-01-15.log
│   └── 2024-01-16.log
└── dashboard-service/
    ├── 2024-01-15.log
    └── 2024-01-16.log
```

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

### Ротация логов

- **По размеру**: Новый файл создается каждые `maxLinesPerFile` строк (по умолчанию 10,000)
- **По дате**: Каждый день создается новый файл с датой в имени
- **Автоочистка**: Старые файлы удаляются через `maxFiles` дней (по умолчанию 30)

### Интеграция с Logstash

При указании `logstashHost` и `logstashPort` в конфигурации, все логи уровня **error** автоматически отправляются в Logstash через TCP.

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

Пакет имеет **100% покрытие тестами**.

```bash
# Запустить тесты
npm test

# Запустить тесты с покрытием
npm run test:coverage
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

## 🚨 Troubleshooting

### Логи не записываются в файл

**Решение:**
1. Проверьте права доступа к директории `{logDir}/{serviceName}`
2. Убедитесь, что уровень логирования НЕ `debug` (debug только в консоль)

### Не отправляется в Logstash

**Решение:**
1. Проверьте `logstashHost` и `logstashPort` в конфигурации
2. Проверьте доступность Logstash сервера
3. Проверьте, что логируется уровень `error` (только error идут в Logstash)

### Debug логи не записываются в файл

Debug логи предназначены для отладки и могут быть очень частыми. Чтобы не создавать лишнюю нагрузку на файловую систему, они выводятся только в консоль.

## 📄 Лицензия

MIT

## 👥 Автор

Skryabin Aleksey
