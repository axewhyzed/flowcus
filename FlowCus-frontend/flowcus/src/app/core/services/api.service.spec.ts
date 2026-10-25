import axios, { AxiosInstance } from 'axios';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
import { ErrorHandlingService } from './error-handling.service';

describe('ApiService browser auth', () => {
  it('uses the CSRF-protected cookie without attaching a bearer token', () => {
    let requestHandler: (config: any) => any = config => config;
    let responseErrorHandler: (error: any) => Promise<never> = error => Promise.reject(error);
    const instance = {
      interceptors: {
        request: { use: jasmine.createSpy().and.callFake((handler: (config: any) => any) => requestHandler = handler) },
        response: { use: jasmine.createSpy().and.callFake((_success: unknown, error: (error: any) => Promise<never>) => responseErrorHandler = error) }
      },
      get: jasmine.createSpy(),
      post: jasmine.createSpy(),
      put: jasmine.createSpy(),
      patch: jasmine.createSpy(),
      delete: jasmine.createSpy()
    } as unknown as AxiosInstance;
    spyOn(axios, 'create').and.returnValue(instance);
    localStorage.setItem('auth_token', 'legacy-jwt');
    const errorHandler = jasmine.createSpyObj<ErrorHandlingService>('ErrorHandlingService', ['handleError']);
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const service = new ApiService(errorHandler, router);
    service.setCsrfToken('memory-csrf');

    const protectedWrite = requestHandler({ method: 'post', url: 'tasks', headers: {} });
    const login = requestHandler({ method: 'post', url: 'auth/login', headers: {} });

    expect(protectedWrite.headers['X-CSRF-Token']).toBe('memory-csrf');
    expect(protectedWrite.headers.Authorization).toBeUndefined();
    expect(protectedWrite.headers['X-Timezone-Id']).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
    expect(protectedWrite.headers['X-Timezone-Offset']).toBe(new Date().getTimezoneOffset().toString());
    expect(login.headers['X-Auth-Mode']).toBe('cookie');
    expect(login.headers['X-CSRF-Token']).toBeUndefined();
    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  it('keeps a password-entry 400 from triggering session expiry but clears state for a protected 401', async () => {
    let responseErrorHandler: (error: any) => Promise<never> = error => Promise.reject(error);
    const instance = {
      interceptors: {
        request: { use: jasmine.createSpy() },
        response: { use: jasmine.createSpy().and.callFake((_success: unknown, error: (error: any) => Promise<never>) => responseErrorHandler = error) }
      },
      get: jasmine.createSpy(), post: jasmine.createSpy(), put: jasmine.createSpy(),
      patch: jasmine.createSpy(), delete: jasmine.createSpy()
    } as unknown as AxiosInstance;
    spyOn(axios, 'create').and.returnValue(instance);
    const errorHandler = jasmine.createSpyObj<ErrorHandlingService>('ErrorHandlingService', ['handleError']);
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const service = new ApiService(errorHandler, router);
    const sessionExpired = jasmine.createSpy('sessionExpired');
    service.sessionExpired$.subscribe(sessionExpired);

    await expectAsync(responseErrorHandler({ response: { status: 400 }, config: { url: 'auth/change-password' } })).toBeRejected();
    expect(sessionExpired).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();

    await expectAsync(responseErrorHandler({ response: { status: 401 }, config: { url: 'tasks' } })).toBeRejected();
    expect(sessionExpired).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledOnceWith(['/login']);
  });
});
