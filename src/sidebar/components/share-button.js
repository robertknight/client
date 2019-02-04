'use strict';

const { createElement } = require('preact');
const propTypes = require('prop-types');

const shareTypes = {
  twitter: {
    urlTemplate:
      'https://twitter.com/intent/tweet?url={url}&hashtags=annotated',
    icon: 'h-icon-twitter',
    title: 'Tweet link',
  },
  facebook: {
    urlTemplate: 'https://www.facebook.com/sharer/sharer.php?u={url}',
    icon: 'h-icon-facebook',
    title: 'Share on Facebook',
  },
  email: {
    urlTemplate: "mailto:?subject=Let's%20Annotate&body={url}",
    icon: 'h-icon-mail',
    title: 'Share via email',
  },
};

/**
 * A button for sharing a link to a social media or mail destination.
 */
function ShareButton({ url, onClick, type }) {
  const { urlTemplate, icon, title } = shareTypes[type];

  const encodedUrl = encodeURIComponent(url);
  const shareUrl = urlTemplate.replace('{url}', encodedUrl);

  return (
    <a
      href={shareUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      className={'share-link-icon ' + icon}
      onClick={() => onClick(type)}
    />
  );
}

ShareButton.propTypes = {
  url: propTypes.string,
  onClick: propTypes.func,
  type: propTypes.string,
};

module.exports = ShareButton;
