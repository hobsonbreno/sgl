import { retryWithBackoff } from './retry-with-backoff';

describe('retryWithBackoff', () => {
  it('should resolve immediately if function succeeds', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    const result = await retryWithBackoff(fn, { maxRetries: 3 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry and succeed on second attempt', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce('success');
    
    const onRetry = jest.fn();
    const result = await retryWithBackoff(fn, { 
      maxRetries: 3, 
      baseDelayMs: 10,
      onRetry 
    });
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should fail if max retries exceeded', async () => {
    const error = new Error('timeout');
    const fn = jest.fn().mockRejectedValue(error);
    
    await expect(retryWithBackoff(fn, { maxRetries: 2, baseDelayMs: 10 })).rejects.toThrow(error);
    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('should not retry on non-retriable errors like 404', async () => {
    const error = new Error('Status 404');
    const fn = jest.fn().mockRejectedValue(error);
    
    await expect(retryWithBackoff(fn, { maxRetries: 3, baseDelayMs: 10 })).rejects.toThrow(error);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on retriable code errors', async () => {
    const error = new Error('Network error');
    (error as any).code = 'ECONNRESET';
    const fn = jest
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce('success');
    
    const result = await retryWithBackoff(fn, { maxRetries: 1, baseDelayMs: 10 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
