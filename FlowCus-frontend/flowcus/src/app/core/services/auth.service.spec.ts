import { Subject } from 'rxjs';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';
import { API_ENDPOINTS } from '../constants/api-endpoints';

describe('AuthService browser cookie flow', () => {
  beforeEach(() => localStorage.removeItem('auth_token'));

  it('keeps the browser session token out of localStorage and loads a CSRF token in memory', async () => {
    const api = {
      sessionExpired$: new Subject<void>(),
      post: jasmine.createSpy().and.returnValue(Promise.resolve({
        user: { id: 3, username: 'member', isAdmin: false },
        csrfToken: 'csrf-from-login'
      })),
      get: jasmine.createSpy().and.callFake((url: string) => Promise.resolve(
        url === API_ENDPOINTS.AUTH.ME
          ? { id: 3, username: 'member', isAdmin: false }
          : { csrfToken: 'csrf-from-endpoint' }
      )),
      setCsrfToken: jasmine.createSpy(),
      clearSession: jasmine.createSpy()
    };
    const service = new AuthService(api as unknown as ApiService);

    await service.login({ username: 'member', password: 'correct-password' });

    expect(api.post).toHaveBeenCalledOnceWith(API_ENDPOINTS.AUTH.LOGIN, {
      username: 'member', password: 'correct-password'
    });
    expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.AUTH.ME);
    expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.AUTH.CSRF);
    expect(api.setCsrfToken).toHaveBeenCalledWith('csrf-from-endpoint');
    expect(service.isAuthenticated).toBeTrue();
    expect(localStorage.getItem('auth_token')).toBeNull();
  });
});
