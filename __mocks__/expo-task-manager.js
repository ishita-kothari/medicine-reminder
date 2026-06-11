module.exports = {
  defineTask: jest.fn(),
  registerTaskAsync: jest.fn().mockResolvedValue(undefined),
  unregisterTaskAsync: jest.fn().mockResolvedValue(undefined),
  isTaskRegisteredAsync: jest.fn().mockResolvedValue(false),
  TaskManagerTaskBehavior: { CONTINUE: 'CONTINUE' },
};
