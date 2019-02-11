'use strict';

const { createElement } = require('preact');
const propTypes = require('prop-types');
const classnames = require('classnames');

const { isReply, flagCount } = require('../annotation-metadata');

/**
 * A banner which displays above annotations that have either been flagged for
 * review by a moderator or hidden by a moderator.
 *
 * Only group members with moderation rights will see this banner.
 */
function ModerationBanner({ annotation, store, flash, api }) {
  const flagCount_ = flagCount(annotation);
  const isHidden = annotation.hidden;
  const isHiddenOrFlagged = flagCount_ !== null && (flagCount_ > 0 || isHidden);

  if (!isHiddenOrFlagged) {
    return null;
  }

  const hide = () => {
    return api.annotation
      .hide({ id: annotation.id })
      .then(() => {
        store.hideAnnotation(annotation.id);
      })
      .catch(() => {
        flash.error('Failed to hide annotation');
      });
  };

  const unhide = () => {
    return api.annotation
      .unhide({ id: annotation.id })
      .then(() => {
        store.unhideAnnotation(annotation.id);
      })
      .catch(() => {
        flash.error('Failed to unhide annotation');
      });
  };

  return (
    <div
      className={classnames({
        'moderation-banner': true,
        'is-flagged': flagCount_ > 0,
        'is-hidden': isHidden,
        'is-reply': isReply(annotation),
      })}
    >
      {!isHidden && <span>Flagged for review x{flagCount_}</span>}
      {isHidden && <span>Hidden from users. Flagged x{flagCount_}</span>}
      <span className="u-stretch" />
      {!isHidden && (
        <button
          type="button"
          onClick={hide}
          title="Hide this annotation from non-moderators"
        >
          Hide
        </button>
      )}
      {isHidden && (
        <button
          type="button"
          onClick={unhide}
          title="Make this annotation visible to everyone"
        >
          Unhide
        </button>
      )}
    </div>
  );
}

ModerationBanner.propTypes = {
  annotation: propTypes.object,

  store: propTypes.object,
  flash: propTypes.object,
  api: propTypes.object,
};

ModerationBanner.injectedProps = ['api', 'flash', 'store'];

module.exports = ModerationBanner;
