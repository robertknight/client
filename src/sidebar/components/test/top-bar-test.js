'use strict';

const { createElement } = require('preact');
const { shallow } = require('enzyme');

const TopBar = require('../top-bar');

describe('TopBar', () => {
  const fakeSettings = {};
  let fakeIsThirdPartyService;

  beforeEach(() => {
    fakeIsThirdPartyService = sinon.stub().returns(false);

    TopBar.$imports.$mock({
      '../util/is-third-party-service': fakeIsThirdPartyService,
    });
  });

  afterEach(() => {
    TopBar.$imports.$restore();
  });

  function applyUpdateBtn(wrapper) {
    return wrapper.find('.top-bar__apply-update-btn');
  }

  function helpBtn(wrapper) {
    return wrapper.find('.top-bar__help-btn');
  }

  function createTopBar(props = {}) {
    return shallow(
      <TopBar isSidebar={true} settings={fakeSettings} {...props} />
    ).dive(); // Dive through `withServices` wrapper.
  }

  it('shows the pending update count', () => {
    const wrapper = createTopBar({
      pendingUpdateCount: 1,
    });
    const applyBtn = applyUpdateBtn(wrapper);
    assert.isTrue(applyBtn.exists());
  });

  it('does not show the pending update count when there are no updates', () => {
    const wrapper = createTopBar({
      pendingUpdateCount: 0,
    });
    const applyBtn = applyUpdateBtn(wrapper[0]);
    assert.isFalse(applyBtn.exists());
  });

  it('applies updates when clicked', () => {
    const onApplyPendingUpdates = sinon.stub();
    const wrapper = createTopBar({
      pendingUpdateCount: 1,
      onApplyPendingUpdates,
    });
    const applyBtn = applyUpdateBtn(wrapper);
    applyBtn.simulate('click');
    assert.called(onApplyPendingUpdates);
  });

  it('shows help when help icon clicked', () => {
    const onShowHelpPanel = sinon.stub();
    const wrapper = createTopBar({
      onShowHelpPanel: onShowHelpPanel,
    });
    const help = helpBtn(wrapper);
    help.simulate('click');
    assert.called(onShowHelpPanel);
  });

  it('displays the login control and propagates callbacks', () => {
    const onShowHelpPanel = sinon.stub();
    const onLogin = sinon.stub();
    const onLogout = sinon.stub();
    const wrapper = createTopBar({
      onShowHelpPanel: onShowHelpPanel,
      onLogin: onLogin,
      onLogout: onLogout,
    });
    const loginControl = wrapper
      .find('login-control')
      .controller('loginControl');

    loginControl.onLogin();
    assert.called(onLogin);

    loginControl.onLogout();
    assert.called(onLogout);
  });

  it("checks whether we're using a third-party service", () => {
    createTopBar();

    assert.called(fakeIsThirdPartyService);
    assert.alwaysCalledWithExactly(fakeIsThirdPartyService, fakeSettings);
  });

  context('when using a first-party service', () => {
    it('shows the share page button', () => {
      const wrapper = createTopBar();
      assert.isTrue(wrapper.exists('[title="Share this page"]'));
    });
  });

  context('when using a third-party service', () => {
    beforeEach(() => {
      fakeIsThirdPartyService.returns(true);
    });

    it("doesn't show the share page button", () => {
      const wrapper = createTopBar();
      assert.isFalse(wrapper.exists('[title="Share this page"]'));
    });
  });

  it('displays the share page when "Share this page" is clicked', () => {
    const onSharePage = sinon.stub();
    const wrapper = createTopBar({ onSharePage });
    wrapper.find('[title="Share this page"]').simulate('click');
    assert.called(onSharePage);
  });

  it('displays the search input and propagates query changes', () => {
    const onSearch = sinon.stub();
    const wrapper = createTopBar({
      searchController: {
        query: sinon.stub().returns('query'),
        update: onSearch,
      },
    });
    const searchInput = wrapper.find('SearchInput');

    assert.equal(searchInput.prop('query'), 'query');
    searchInput.props().onSearch({ $query: 'new-query' });
    assert.calledWith(onSearch, 'new-query');
  });

  it('shows the clean theme when settings contains the clean theme option', () => {
    const wrapper = createTopBar();
    assert.isTrue(wrapper.exists('.top-bar--theme-clean'));
  });
});
