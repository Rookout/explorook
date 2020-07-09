module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 60000,
  testMatch: ["**/__tests__/**/*.[jt]s?(x)"],
  projects: ["src/"]
};