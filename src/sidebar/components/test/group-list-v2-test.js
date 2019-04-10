'use strict';

const { shallow } = require('enzyme');
const { createElement } = require('preact');

const GroupListV2 = require('../group-list-v2');

describe('GroupListV2', () => {
  let fakeAnalytics;
  let fakeServiceUrl;
  let fakeSettings;
  let fakeStore;

  const testGroup = {
    id: 'testgroup',
    name: 'Test group',
    organization: { id: 'testorg', name: 'Test Org' },
  };

  function createGroupList() {
    return shallow(
      <GroupListV2
        analytics={fakeAnalytics}
        serviceUrl={fakeServiceUrl}
        settings={fakeSettings}
        store={fakeStore}
      />
    );
  }

  beforeEach(() => {
    fakeAnalytics = {};
    fakeServiceUrl = sinon.stub();
    fakeSettings = {
      authDomain: 'hypothes.is',
    };
    fakeStore = {
      getCurrentlyViewingGroups: sinon.stub().returns([]),
      getFeaturedGroups: sinon.stub().returns([]),
      getMyGroups: sinon.stub().returns([]),
      profile: sinon.stub().returns({ userid: null }),
    };
  });

  it('displays no sections if there are no groups', () => {
    const wrapper = createGroupList();
    assert.isFalse(wrapper.exists('GroupListSection'));
  });

  it('displays "Currently Viewing" section if there are currently viewing groups', () => {
    fakeStore.getCurrentlyViewingGroups.returns([testGroup]);
    const wrapper = createGroupList();
    assert.isTrue(
      wrapper.exists('GroupListSection[heading="Currently Viewing"]')
    );
  });

  it('displays "Featured Groups" section if there are featured groups', () => {
    fakeStore.getFeaturedGroups.returns([testGroup]);
    const wrapper = createGroupList();
    assert.isTrue(
      wrapper.exists('GroupListSection[heading="Featured Groups"]')
    );
  });

  it('displays "My Groups" section if user is a member of any groups', () => {
    fakeStore.getMyGroups.returns([testGroup]);
    const wrapper = createGroupList();
    assert.isTrue(wrapper.exists('GroupListSection[heading="My Groups"]'));
  });

  [
    {
      userid: null,
      expectNewGroupButton: false,
    },
    {
      userid: 'acct:john@hypothes.is',
      expectNewGroupButton: true,
    },
    {
      userid: 'acct:john@otherpublisher.org',
      expectNewGroupButton: false,
    },
  ].forEach(({ userid, expectNewGroupButton }) => {
    it('displays "New private group" button if user is logged in with first-party account', () => {
      fakeStore.profile.returns({ userid });
      const wrapper = createGroupList();
      const newGroupButton = wrapper
        .find('a')
        .filterWhere(link => link.text() === 'New private group');
      assert.equal(newGroupButton.length, expectNewGroupButton ? 1 : 0);
    });
  });

  it('opens new window at correct URL when "New private group" is clicked', () => {
    fakeServiceUrl
      .withArgs('groups.new')
      .returns('https://example.com/groups/new');
    fakeStore.profile.returns({ userid: 'jsmith@hypothes.is' });
    const wrapper = createGroupList();
    const newGroupButton = wrapper
      .find('a')
      .filterWhere(link => link.text() === 'New private group');
    assert.equal(newGroupButton.props().href, 'https://example.com/groups/new');
  });
});
