'use strict';

const { shallow } = require('enzyme');
const { createElement } = require('preact');

const GroupList = require('../group-list-v2');

describe('GroupList', () => {
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
      <GroupList
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

  afterEach(() => {
    GroupList.$imports.$restore();
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

  it('sorts groups within each section by organization', () => {
    const testGroups = [
      {
        ...testGroup,
        id: 'zzz',
      },
      {
        ...testGroup,
        id: 'aaa',
      },
    ];
    fakeStore.getMyGroups.returns(testGroups);
    fakeStore.getCurrentlyViewingGroups.returns(testGroups);
    fakeStore.getFeaturedGroups.returns(testGroups);

    const fakeGroupOrganizations = groups =>
      groups.sort((a, b) => a.id.localeCompare(b.id));
    GroupList.$imports.$mock({
      '../util/group-organizations': fakeGroupOrganizations,
    });

    const wrapper = createGroupList();
    const sections = wrapper.find('GroupListSection');

    assert.equal(sections.length, 3);
    sections.forEach(section => {
      assert.deepEqual(
        section.prop('groups'),
        fakeGroupOrganizations(testGroups)
      );
    });
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
      const newGroupButton = wrapper.find(
        'GroupListItemBase[label="New private group"]'
      );
      assert.equal(newGroupButton.length, expectNewGroupButton ? 1 : 0);
    });
  });

  it('opens new window at correct URL when "New private group" is clicked', () => {
    fakeServiceUrl
      .withArgs('groups.new')
      .returns('https://example.com/groups/new');
    fakeStore.profile.returns({ userid: 'jsmith@hypothes.is' });
    const wrapper = createGroupList();
    const newGroupButton = wrapper.find(
      'GroupListItemBase[label="New private group"]'
    );
    assert.equal(newGroupButton.props().href, 'https://example.com/groups/new');
  });

  it('displays the group name and icon as static text if there is only one group and no actions available', () => {
    // TODO
  });
});
