import LoggerError from "src/errors/logger.error";

describe("LoggerError", () => {
	describe("constructor", () => {
		it("должен создать экземпляр LoggerError", () => {
			const error = new LoggerError("Test error message");

			expect(error).toBeInstanceOf(LoggerError);
			expect(error).toBeInstanceOf(Error);
		});

		it("должен установить правильное имя ошибки", () => {
			const error = new LoggerError("Test error message");

			expect(error.name).toBe("LoggerError");
		});

		it("должен установить сообщение ошибки", () => {
			const message = "Test error message";
			const error = new LoggerError(message);

			expect(error.message).toBe(message);
		});

		it("должен сохранить причину ошибки если она передана", () => {
			const cause = new Error("Original error");
			const error = new LoggerError("Test error message", cause);

			expect(error.cause).toBe(cause);
		});

		it("должен не устанавливать cause если он не передан", () => {
			const error = new LoggerError("Test error message");

			expect(error.cause).toBeUndefined();
		});

		it("должен корректно работать с instanceof", () => {
			const error = new LoggerError("Test error message");

			expect(error instanceof LoggerError).toBe(true);
			expect(error instanceof Error).toBe(true);
		});

		it("должен логировать ошибку в консоль при создании", () => {
			const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
			const message = "Test error message";
			const cause = new Error("Original error");

			new LoggerError(message, cause);

			expect(consoleErrorSpy).toHaveBeenCalledWith(message, cause);

			consoleErrorSpy.mockRestore();
		});

		it("должен логировать ошибку без cause если он не передан", () => {
			const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
			const message = "Test error message";

			new LoggerError(message);

			expect(consoleErrorSpy).toHaveBeenCalledWith(message, undefined);

			consoleErrorSpy.mockRestore();
		});

		it("должен иметь readonly свойства message и cause", () => {
			const cause = new Error("Original error");
			const error = new LoggerError("Test error message", cause);

			// Проверяем что свойства доступны только для чтения через TypeScript
			// В runtime мы можем проверить что они установлены
			expect(error.message).toBe("Test error message");
			expect(error.cause).toBe(cause);
		});
	});
});
