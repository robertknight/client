'use strict';

// @ngInject
function ModerationBannerController(annotationUI, flash, store) {
  var self = this;

  this.flagCount = function () {
    var moderation = self.annotation.moderation;
    if (!moderation) {
      return 0;
    }
    return moderation.flag_count;
  };

  this.isHidden = function () {
    var moderation = self.annotation.moderation;
    if (!moderation) {
      return 0;
    }
    return moderation.is_hidden;
  };

  /**
   * Hide an annotation from non-moderator users.
   */
  this.hideAnnotation = function () {
    store.annotation.hide({id: this.annotationId}).then(function () {
      // TODO - Update the state of the annotation locally
    }).catch(function (err) {
      flash.error(err.message);
    });
  };

  /**
   * Un-hide an annotation from non-moderator users.
   */
  this.unhideAnnotation = function () {
    store.annotation.unhide({id: this.annotationId}).then(function () {
      // TODO - Update the state of the annotation locally
      annotationUI.annotationHiddenChanged(this.annotationId, false);
    }).catch(function (err) {
      flash.error(err.message);
    });
  };
}

/**
 * Banner shown above flagged annotations to allow moderators to hide/unhide the
 * annotation from other users.
 */

module.exports = {
  controller: ModerationBannerController,
  controllerAs: 'vm',
  bindings: {
    annotation: '<',
  },
  template: require('../templates/moderation_banner.html'),
};
