'use strict';

const { createElement } = require('preact');
const { mount } = require('enzyme');

const ModerationBanner = require('../moderation-banner-react');
const { moderatedAnnotation } = require('../../test/annotation-fixtures');

describe('ModerationBanner', () => {
  let fakeStore;
  let fakeFlash;
  let fakeApi;

  beforeEach(() => {
    fakeStore = {
      hideAnnotation: sinon.stub(),
      unhideAnnotation: sinon.stub(),
    };
    fakeApi = {
      annotation: {
        hide: sinon.stub().resolves(null),
        unhide: sinon.stub().resolves(null),
      },
    };
    fakeFlash = {
      error: sinon.stub(),
    };
  });

  function render(annotation) {
    return mount(
      <ModerationBanner
        annotation={annotation}
        store={fakeStore}
        flash={fakeFlash}
        api={fakeApi}
      />
    );
  }

  const normalAnn = moderatedAnnotation({ hidden: false, flagCount: 0 });
  const hiddenAnn = moderatedAnnotation({ hidden: true, flagCount: 1 });
  const flaggedAnn = moderatedAnnotation({ hidden: false, flagCount: 2 });

  it('shows if annotation is hidden', () => {
    assert.isTrue(render(hiddenAnn).exists('div'));
  });

  it('shows if annotation is flagged', () => {
    assert.isTrue(render(flaggedAnn).exists('div'));
  });

  it('does not show if annotation is not hidden or flagged', () => {
    assert.isFalse(render(normalAnn).exists('div'));
  });

  it('shows "Hide" button if annotation is not hidden', () => {
    const wrapper = render(flaggedAnn);
    const btn = wrapper.find('button');
    const msg = wrapper.find('span').first();
    assert.equal(btn.text(), 'Hide');
    assert.equal(msg.text(), 'Flagged for review x2');
  });

  it('shows "Unhide" button if annotation is hidden', () => {
    const wrapper = render(hiddenAnn);
    const btn = wrapper.find('button');
    const msg = wrapper.find('span').first();
    assert.equal(btn.text(), 'Unhide');
    assert.equal(msg.text(), 'Hidden from users. Flagged x1');
  });

  it('hides the annotation when "Hide" is clicked', () => {
    const btn = render(flaggedAnn).find('button');
    return btn
      .props()
      .onClick()
      .then(() => {
        assert.calledWith(fakeApi.annotation.hide, { id: flaggedAnn.id });
        assert.calledWith(fakeStore.hideAnnotation, flaggedAnn.id);
      });
  });

  it('unhides the annotation when "Unhide" is clicked', () => {
    const btn = render(hiddenAnn).find('button');
    return btn
      .props()
      .onClick()
      .then(() => {
        assert.calledWith(fakeApi.annotation.unhide, { id: flaggedAnn.id });
        assert.calledWith(fakeStore.unhideAnnotation, flaggedAnn.id);
      });
  });

  it('reports an error if hiding fails', () => {
    const btn = render(flaggedAnn).find('button');
    fakeApi.annotation.hide.rejects(new Error('Hiding failed'));
    return btn
      .props()
      .onClick()
      .then(() => {
        assert.calledWith(fakeFlash.error, 'Failed to hide annotation');
      });
  });

  it('reports an error if unhiding fails', () => {
    const btn = render(hiddenAnn).find('button');
    fakeApi.annotation.unhide.rejects(new Error('Unhiding failed'));
    return btn
      .props()
      .onClick()
      .then(() => {
        assert.calledWith(fakeFlash.error, 'Failed to unhide annotation');
      });
  });
});
