'use strict';

const { createElement } = require('preact');
const propTypes = require('prop-types');

const ShareButton = require('./share-button');

/**
 * A dialog for sharing a link to the current page.
 */
function SharePageDialog({ onClose, analytics, store }) {
  const frames = store.frames();
  const url = frames.length > 0 ? frames[0].uri : '';
  const trackShare = type =>
    analytics.track(analytics.events.DOCUMENT_SHARED, type);

  const sharePageLink = 'https://hyp.is/go?url=' + encodeURIComponent(url);

  const focusInput = el => {
    if (!el) {
      return;
    }
    el.focus();
    el.select();
  };

  return (
    <div className="sheet">
      <i
        className="close h-icon-close"
        role="button"
        title="Close"
        onClick={onClose}
      />
      <div className="form-vertical">
        <ul className="nav nav-tabs">
          <li className="active">
            <a href="">Share</a>
          </li>
        </ul>
        <div className="tab-content">
          <p>
            Share the link below to show anyone these annotations and invite
            them to contribute their own.
          </p>
          <p>
            <input
              className="form-input"
              type="text"
              value={sharePageLink}
              readOnly
              ref={focusInput}
            />
          </p>
          <p className="share-link-icons">
            <ShareButton
              url={sharePageLink}
              type="twitter"
              onClick={trackShare}
            />
            <ShareButton
              url={sharePageLink}
              type="facebook"
              onClick={trackShare}
            />
            <ShareButton
              url={sharePageLink}
              type="email"
              onClick={trackShare}
            />
          </p>
        </div>
      </div>
    </div>
  );
}

SharePageDialog.propTypes = {
  onClose: propTypes.func,

  analytics: propTypes.object,
  store: propTypes.object,
};

SharePageDialog.injectedProps = ['analytics', 'store'];

module.exports = SharePageDialog;
