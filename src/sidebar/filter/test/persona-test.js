'use strict';

var persona = require('../../util/account-id');

describe('persona', function () {
  var term = 'acct:hacker@example.com';

  describe('parseAccountID', function() {
    it('should extract the username and provider', function () {
      assert.deepEqual(persona.parseAccountID(term), {
        username: 'hacker',
        provider: 'example.com',
      });
    });

    it('should return null if the ID is invalid', function () {
      assert.equal(persona.parseAccountID('bogus'), null);
    });
  });

  describe('username', function () {
    it('should return the username from the account ID', function () {
      assert.equal(persona.username(term), 'hacker');
    });

    it('should return an empty string if the ID is invalid', function () {
      assert.equal(persona.username('bogus'), '');
    });
  });

  describe('isThirdPartyUser', function () {
    it('should return true if user is a third party user', function () {
      assert.isTrue(persona.isThirdPartyUser('acct:someone@example.com', 'ex.com'));
    });

    it('should return false if user is not a third party user', function () {
      assert.isFalse(persona.isThirdPartyUser('acct:someone@example.com', 'example.com'));
    });

    it('should return false if the user is invalid', function () {
      assert.isFalse(persona.isThirdPartyUser('bogus', 'example.com'));
    });
  });
});
