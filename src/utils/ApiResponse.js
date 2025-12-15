export const ApiResponse = class ApiResponse {
  constructor(statusCode, message = "success", data) {
    this.statusCode = statusCode < 200;
    this.data = data;
    this.success = true;
    this.message = message;
  }
};
