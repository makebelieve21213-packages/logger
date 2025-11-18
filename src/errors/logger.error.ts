/**
 * Кастомная ошибка для логгера
 * Наследуется от стандартной Error и используется для обработки ошибок в модуле логирования
 */
export default class LoggerError extends Error {
	constructor(
		readonly message: string,
		readonly cause?: Error
	) {
		super(message);
		this.name = "LoggerError";

		// Сохраняем причину ошибки для цепочки ошибок
		if (cause) {
			this.cause = cause;
		}

		console.error(this.message, this.cause);

		// Устанавливаем правильный прототип для корректной работы instanceof
		Object.setPrototypeOf(this, LoggerError.prototype);
	}
}
