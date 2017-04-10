'use strict';

module.exports = {
  controllerAs: 'vm',
  bindings: {
    canDelete: '<',
    canEdit: '<',
    editing: '<',
    group: '<',
    hasContent: '<',
    isDeleted: '<',
    isReply: '<',
    isSaving: '<',
    isShared: '<',
    onDelete: '&',
    onEdit: '&',
    onReply: '&',
    onRevert: '&',
    onSave: '&',
    onSetPrivacy: '&',
    replyCount: '<',
  },
  template: require('../templates/annotation-footer.html'),
};
