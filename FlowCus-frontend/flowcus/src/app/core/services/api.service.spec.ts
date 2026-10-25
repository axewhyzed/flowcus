import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ApiService } from './api.service';
import { ErrorHandlingService } from './error-handling.service';

describe('ApiService browser auth', () => {
  it('uses the CSRF-protected cookie without attaching a bearer token', async () => {
    let capturedOptions: any = null;
    const http = {
      request: jasmine.createSpy('request').and.callFake((method: string, url: string, options: any) => {
        capturedOptions = options;
        return of({ success: true });
      })
    } as unknown as HttpClient;

    localStorage.setItem('auth_token', 'legacy-jwt');
    const errorHandler = jasmine.createSpyObj<ErrorHandlingService>('ErrorHandlingService', ['handleError']);
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const service = new ApiService(http, errorHandler, router);
    service.setCsrfToken('memory-csrf');

    await service.post('tasks', { title: 'Test Task' });
    const protectedHeaders: HttpHeaders = capturedOptions.headers;

    expect(protectedHeaders.get('X-CSRF-Token')).toBe('memory-csrf');
    expect(protectedHeaders.get('Authorization')).toBeNull();
    expect(protectedHeaders.get('X-Timezone-Id')).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
    expect(protectedHeaders.get('X-Timezone-Offset')).toBe(new Date().getTimezoneOffset().toString());
    expect(capturedOptions.withCredentials).toBeTrue();
    expect(localStorage.getItem('auth_token')).toBeNull();

    await service.post('auth/login', { username: 'u', password: 'p' });
    const loginHeaders: HttpHeaders = capturedOptions.headers;

    expect(loginHeaders.get('X-Auth-Mode')).toBe('cookie');
    expect(loginHeaders.get('X-CSRF-Token')).toBeNull();
  });

  it('keeps a password-entry 400 from triggering session expiry but clears state for a protected 401', async () => {
    const http = {
      request: jasmine.createSpy('request')
    } as unknown as HttpClient;

    const errorHandler = jasmine.createSpyObj<ErrorHandlingService>('ErrorHandlingService', ['handleError']);
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const service = new ApiService(http, errorHandler, router);
    const sessionExpired = jasmine.createSpy('sessionExpired');
    service.sessionExpired$.subscribe(sessionExpired);

    const error400 = new HttpErrorResponse({ status: 400, url: 'auth/change-password' });
    (http.request as jasmine.Spy).and.returnValue(throwError(() => error400));

    await expectAsync(service.post('auth/change-password', {})).toBeRejected();
    expect(sessionExpired).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(errorHandler.handleError).toHaveBeenCalledTimes(1);

    const error401 = new HttpErrorResponse({ status: 401, url: 'tasks' });
    (http.request as jasmine.Spy).and.returnValue(throwError(() => error401));

    await expectAsync(service.get('tasks')).toBeRejected();
    expect(sessionExpired).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledOnceWith(['/login']);
  });
});
