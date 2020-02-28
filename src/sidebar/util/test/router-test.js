import EventEmitter from 'tiny-emitter';

import { Routes, Router } from '../router';

function createRoutes() {
  return new Routes([
    {
      name: 'annotation',
      path: '/annotations/:id',
    },
    {
      name: 'activity',
      path: '/activity',
    },
    {
      name: 'tag',
      path: '/groups/:groupId/tags/:tagName',
    },
    {
      name: 'default',
    },
  ]);
}

describe('sidebar/util/router', () => {
  describe('Routes', () => {
    describe('#match', () => {
      [
        {
          description: 'no params',
          url: '/activity',
          expectedRoute: 'activity',
          expectedParams: {},
        },
        {
          description: 'one param',
          url: '/annotations/123',
          expectedRoute: 'annotation',
          expectedParams: { id: '123' },
        },
        {
          description: 'multiple params',
          url: '/groups/g1/tags/foobar',
          expectedRoute: 'tag',
          expectedParams: { groupId: 'g1', tagName: 'foobar' },
        },
        {
          description: 'missing param',
          url: '/annotations/',
          expectedRoute: 'default',
          expectedParams: {},
        },
        {
          description: 'fallback',
          url: '/invalid',
          expectedRoute: 'default',
          expectedParams: {},
        },
        {
          description: 'unused params',
          url: '/activity?q=foobar',
          expectedRoute: 'activity',
          expectedParams: { q: 'foobar' },
        },
      ].forEach(({ description, url, expectedRoute, expectedParams }) => {
        it(`returns the matching route and params (${description})`, () => {
          const routes = createRoutes();
          const match = routes.match(url);
          assert.deepEqual(match, {
            route: expectedRoute,
            params: expectedParams,
          });
        });
      });

      it('throws an error if no route matches', () => {
        const routes = new Routes([]);
        assert.throws(() => {
          routes.match('/invalid');
        }, 'No matching route found');
      });
    });

    describe('#url', () => {
      it('thows an error if the route does not exist', () => {
        const routes = createRoutes();
        assert.throws(() => {
          routes.url('invalid');
        }, 'No route named "invalid" exists');
      });

      it('throws an error if the route has not have a path', () => {
        const routes = createRoutes();
        assert.throws(() => {
          routes.url('default');
        }, 'Route "default" has no path');
      });

      it('throws an error if a required parameter is missing', () => {
        const routes = createRoutes();
        assert.throws(() => {
          routes.url('annotation');
        }, 'Missing path param "id"');
      });

      [
        {
          description: 'route with param',
          route: 'annotation',
          params: { id: '123' },
          expectedURL: '/annotations/123',
        },
        {
          description: 'route with query string',
          route: 'activity',
          params: { q: 'foobar' },
          expectedURL: '/activity?q=foobar',
        },
        {
          description: 'route with query string #2',
          route: 'activity',
          params: { q: 'foo bar' },
          expectedURL: '/activity?q=foo%20bar',
        },
      ].forEach(({ description, route, params, expectedURL }) => {
        it(`returns the expected URL (${description})`, () => {
          const routes = createRoutes();
          const url = routes.url(route, params);
          assert.equal(url, expectedURL);
        });
      });
    });
  });

  describe('Router', () => {
    const defaultRoutes = [
      {
        name: 'annotation',
        path: '/annotations/:id',
      },
      {
        name: 'fallback',
      },
    ];

    let fakeWindow;

    beforeEach(() => {
      fakeWindow = new EventEmitter();
      Object.assign(fakeWindow, {
        location: { href: 'https://example.com/' },
        history: {
          pushState: sinon.stub(),
        },
        addEventListener: fakeWindow.on,
      });
    });

    function createRouter(routes = defaultRoutes) {
      return new Router(routes, fakeWindow);
    }

    describe('constructor', () => {
      it('should accept a `Routes` dictionary', () => {
        const router = createRouter(new Routes(defaultRoutes));
        router.current();
      });

      it('should accept an array of routes', () => {
        const router = createRouter(defaultRoutes);
        router.current();
      });

      it('should throw an error if there is no fallback route', () => {
        assert.throws(() => {
          createRouter([]);
        }, 'No fallback route defined');
      });
    });

    describe('#current', () => {
      it('should return the route that matches the current URL', () => {
        const router = createRouter();

        fakeWindow.location.href = 'https://example.com/annotations/123';

        assert.deepEqual(router.current(), {
          route: 'annotation',
          params: { id: '123' },
        });
      });
    });

    describe('#navigateTo', () => {
      it('should update the URL', () => {
        const router = createRouter();
        const name = 'annotation';
        const params = { id: '456' };

        router.navigateTo(name, params);

        assert.calledWith(
          fakeWindow.history.pushState,
          { name, params },
          '',
          '/annotations/456'
        );
      });

      it('should emit a "routechange" event', () => {
        const router = createRouter();
        const onChange = sinon.stub();
        router.on('routechange', onChange);

        router.navigateTo('annotation', { id: '456' });

        const current = router.current();
        assert.calledWith(onChange, current.route, current.params);
      });
    });

    it('should emit a "routechange" event when user navigates back', () => {
      const router = createRouter();
      const onChange = sinon.stub();
      router.on('routechange', onChange);

      fakeWindow.emit('popstate', { state: null });

      assert.calledWith(onChange, 'fallback', {});
    });
  });
});
