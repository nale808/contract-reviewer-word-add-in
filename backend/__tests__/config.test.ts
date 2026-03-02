describe('Environment Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('loads valid environment without throwing', () => {
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-12345';
    expect(() => require('../src/config')).not.toThrow();
  });

  it('exits in production with missing required vars', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ANTHROPIC_API_KEY;
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit'); });
    expect(() => require('../src/config')).toThrow();
    mockExit.mockRestore();
  });
});
