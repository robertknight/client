import classnames from 'classnames';
import { createElement } from 'preact';
import { useLayoutEffect, useMemo, useRef } from 'preact/hooks';
import propTypes from 'prop-types';

import { replaceLinksWithEmbeds } from '../media-embedder';
import renderMarkdown from '../render-markdown';

/**
 * A component which renders markdown as HTML and replaces recognized links
 * with embedded video/audio.
 */
export default function MarkdownView({ markdown = '', textClass = {} }) {
  const content = useRef(null);

  useLayoutEffect(() => {
    renderMarkdown(markdown).then(html => {
      if (content.current) {
        content.current.innerHTML = html;
        replaceLinksWithEmbeds(content.current);
      }
    });
  }, [markdown]);

  // Use a blank string to indicate that the content language is unknown and may be
  // different than the client UI. The user agent may pick a default or analyze
  // the content to guess.
  const contentLanguage = '';

  return (
    <div
      className={classnames('markdown-view', textClass)}
      dir="auto"
      lang={contentLanguage}
      ref={content}
    />
  );
}

MarkdownView.propTypes = {
  /** The string of markdown to display. */
  markdown: propTypes.string,

  /**
   * A CSS classname-to-boolean map of classes to apply to the container of
   * the rendered markdown.
   */
  textClass: propTypes.object,
};
