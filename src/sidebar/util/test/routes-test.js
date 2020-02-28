import { Routes } from '../routes';

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
