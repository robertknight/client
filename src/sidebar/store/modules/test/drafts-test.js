'use strict';

var drafts = require('../drafts');
var util = require('../util');

var init = drafts.init;
var actions = drafts.actions;
var selectors = drafts.selectors;
var update = util.createReducer(drafts.update);

var fixtures = {
  savedAnn: {id: '1234', $tag: 't1'},
};

function makeDraft(content) {
  return {
    text: content.text || '',
    tags: content.tags || [],
    isPrivate: content.isPrivate || false,
  };
}

describe('drafts reducer', function () {
  describe('#updateDraft', function () {
    it('adds a new draft if none exists', function () {
      var draft = makeDraft({text: 'some text'});
      var state = update(init(), actions.updateDraft(fixtures.savedAnn, draft));
      assert.deepEqual(state.drafts, [{
        id: '1234',
        $tag: 't1',
        isPrivate: false,
        tags: [],
        text: 'some text',
      }]);
    });

    it('replaces the existing draft', function () {
      var draft = makeDraft({text: 'first draft'});
      var secondDraft = makeDraft({text: 'second draft'});

      var state = update(init(), actions.updateDraft(fixtures.savedAnn, draft));
      state = update(state, actions.updateDraft(fixtures.savedAnn, secondDraft));

      assert.deepEqual(state.drafts, [{
        id: '1234',
        $tag: 't1',
        isPrivate: false,
        tags: [],
        text: 'second draft',
      }]);
    });
  });

  describe('#removeDraft', function () {
    it('removes the existing draft', function () {
      var state = {
        drafts: [{id: '1234'}, {id: '4567'}, {$tag: 't1'}],
      };
      state = update(state, actions.removeDraft({id: '1234'}));
      assert.deepEqual(state, {
        drafts: [{id: '4567'}, {$tag: 't1'}],
      });
    });
  });

  describe('#clearDrafts', function () {
    it('empties the draft list', function () {
      var state = {
        drafts: [{id: '1234'}, {id: '4567'}, {$tag: 't1'}],
      };
      state = update(state, actions.clearDrafts());
      assert.deepEqual(state.drafts, []);
    });
  });

  describe('#getDraft', function () {
    var state = {
      drafts: [{id: '1234'}, {id: '4567'}, {$tag: 't1'}],
    };

    it('returns draft with a matching id', function () {
      assert.deepEqual(selectors.getDraft(state, {id: '1234'}), {id: '1234'});
    });

    it('returns draft with a matching tag', function () {
      assert.deepEqual(selectors.getDraft(state, {$tag: 't1'}), {$tag: 't1'});
    });
  });

  describe('#countDrafts', function () {
    var state = {
      drafts: [{id: '1234'}, {id: '4567'}, {$tag: 't1'}],
    };

    it('returns the count of drafts', function () {
      assert.equal(selectors.countDrafts(state), 3);
    });
  });

  describe('#unsavedDrafts', function () {
    var state = {
      drafts: [{id: '1234'}, {id: '4567'}, {$tag: 't1'}],
    };

    it('returns drafts for annotations that have not been saved', function () {
      assert.deepEqual(selectors.unsavedDrafts(state), [{$tag: 't1'}]);
    });
  });

  describe('#isDraftEmpty', function () {
    it('returns false if the draft has text', function () {
      assert.equal(drafts.isDraftEmpty({id: '1234', text: 'foo', tags: []}), false);
    });

    it('returns false if the draft has tags', function () {
      assert.equal(drafts.isDraftEmpty({id: '1234', text: '', tags: ['foo']}), false);
    });

    it('returns true if the draft has no tags or text', function () {
      assert.equal(drafts.isDraftEmpty({id: '1234', text: '', tags: []}), true);
    });
  });
});

