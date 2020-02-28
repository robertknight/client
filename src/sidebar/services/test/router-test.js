import router from '../router';

describe('router', () => {
  let fakeRouter;

  beforeEach(() => {
    fakeRouter = {
      watch: sinon.stub(),
      current: sinon.stub(),
      navigateTo: sinon.stub(),
    };
  });

  describe('#init', () => {
    it('sets the active route in the store', () => {
    });

    it('updates the active route after a navigation', () => {
    });
  });

  describe('#navigate', () => {
    it('changes the current route', () => {
    });
  });
});
