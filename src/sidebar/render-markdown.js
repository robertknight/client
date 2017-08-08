'use strict';

const createDOMPurify = require('dompurify');
const escapeHtml = require('escape-html');
const katex = require('katex');
const showdown = require('showdown');

const DOMPurify = createDOMPurify(window);

// Ensure that any links generated either by Showdown or in the markdown/HTML
// passed to Showdown open in an external window.
DOMPurify.addHook('afterSanitizeAttributes', node => {
  if ('target' in node) {
    node.setAttribute('target', '_blank');
  }
});

function targetBlank() {
  function filter(text) {
    return text.replace(/<a href=/g, '<a target="_blank" href=');
  }
  return [{ type: 'output', filter: filter }];
}

let converter;

function renderMarkdown(markdown) {
  if (!converter) {
    // see https://github.com/showdownjs/showdown#valid-options
    converter = new showdown.Converter({
      extensions: [targetBlank],
      simplifiedAutoLink: true,
      // Since we're using simplifiedAutoLink we also use
      // literalMidWordUnderscores because otherwise _'s in URLs get
      // transformed into <em>'s.
      // See https://github.com/showdownjs/showdown/issues/211
      literalMidWordUnderscores: true,
    });
  }
  return converter.makeHtml(markdown);
}

function mathPlaceholder(id) {
  return '{math:' + id.toString() + '}';
}

function embedPlaceholder(id) {
  return '{embed:' + id.toString() + '}';
}

/**
 * Parses a string containing mixed markdown and LaTeX in between
 * '$$..$$' or '\( ... \)' delimiters and returns an object containing a
 * list of math blocks found in the string, plus the input string with math
 * blocks replaced by placeholders.
 */
function extractMath(content) {
  const mathBlocks = [];
  let pos = 0;
  let replacedContent = content;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const blockMathStart = replacedContent.indexOf('$$', pos);
    const inlineMathStart = replacedContent.indexOf('\\(', pos);

    if (blockMathStart === -1 && inlineMathStart === -1) {
      break;
    }

    let mathStart;
    let mathEnd;
    if (
      blockMathStart !== -1 &&
      (inlineMathStart === -1 || blockMathStart < inlineMathStart)
    ) {
      mathStart = blockMathStart;
      mathEnd = replacedContent.indexOf('$$', mathStart + 2);
    } else {
      mathStart = inlineMathStart;
      mathEnd = replacedContent.indexOf('\\)', mathStart + 2);
    }

    if (mathEnd === -1) {
      break;
    } else {
      mathEnd = mathEnd + 2;
    }

    const id = mathBlocks.length + 1;
    const placeholder = mathPlaceholder(id);
    mathBlocks.push({
      id: id,
      expression: replacedContent.slice(mathStart + 2, mathEnd - 2),
      inline: inlineMathStart !== -1,
    });

    let replacement;
    if (inlineMathStart !== -1) {
      replacement = placeholder;
    } else {
      // Add new lines before and after math blocks so that they render
      // as separate paragraphs
      replacement = '\n\n' + placeholder + '\n\n';
    }

    replacedContent =
      replacedContent.slice(0, mathStart) +
      replacement +
      replacedContent.slice(mathEnd);
    pos = mathStart + replacement.length;
  }

  return {
    mathBlocks: mathBlocks,
    content: replacedContent,
  };
}

/**
 * @typedef {Object} EmbedLink
 * @prop {string} id
 * @prop {string} url - Original "src" of the embedded content
 */

/**
 * Extract references to embedded `<iframe>` content and replace with
 * placeholders.
 *
 * The placeholders are later replaced with sandboxed iframes, ignoring
 * attributes set on the original iframe. This enables users to copy and paste
 * "embed codes" which include iframes from sites like h5p.org, without
 * incurring the security risks of allowing arbitrary HTML.
 *
 * @param {string} content
 * @return {EmbedLink[]} - List of mappings from placeholder id to "src" value
 */
function extractEmbeds(content) {
  const embedLinks = [];
  let pos = 0;
  let replacedContent = content;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // eslint-disable-line no-constant-condition

    // Using string matching to find iframe tags is imperfect but fast and good
    // enough for our purposes.
    const startTag = '<iframe';
    const endTag = '</iframe>';

    const embedStart = replacedContent.indexOf(startTag, pos);
    if (embedStart === -1) {
      break;
    }
    let embedEnd = replacedContent.indexOf(
      endTag,
      embedStart + startTag.length
    );

    if (embedEnd === -1) {
      break;
    } else {
      embedEnd = embedEnd + endTag.length;
    }

    // Again, using a regex to find and extract the "src" attribute here is
    // not very tolerant but good enough for our needs.
    const srcMatch = replacedContent
      .slice(embedStart, embedEnd)
      .match(/src="([^"]+)"/);
    if (!srcMatch) {
      break;
    }

    const url = srcMatch[1];
    const id = embedLinks.length + 1;
    const placeholder = embedPlaceholder(id);
    embedLinks.push({ id, url });

    // Add new lines before and after embeds so that they render
    // as separate paragraphs
    const replacement = '\n\n' + placeholder + '\n\n';

    replacedContent =
      replacedContent.slice(0, embedStart) +
      replacement +
      replacedContent.slice(embedEnd);
    pos = embedStart + replacement.length;
  }

  return {
    embedLinks,
    content: replacedContent,
  };
}

function insertMath(html, mathBlocks) {
  return mathBlocks.reduce(function(html, block) {
    let renderedMath;
    try {
      if (block.inline) {
        renderedMath = katex.renderToString(block.expression);
      } else {
        renderedMath = katex.renderToString(block.expression, {
          displayMode: true,
        });
      }
    } catch (err) {
      renderedMath = escapeHtml(block.expression);
    }
    return html.replace(mathPlaceholder(block.id), renderedMath);
  }, html);
}

/**
 * Replace embed placeholders with tagged links.
 *
 * The tagged links are later converted to sandboxed iframes by the media
 * embedder.
 */
function insertEmbedLinks(html, embeds) {
  return embeds.reduce((html, embed) => {
    // The "js-embed" class tags the link for later replacement with an iframe
    // by `media-embedder`.
    const embedLink = `<a class="js-embed" href="${encodeURI(
      embed.url
    )}">${escapeHtml(embed.url)}</a>`;
    return html.replace(embedPlaceholder(embed.id), embedLink);
  }, html);
}

function render(markdown) {
  // KaTeX takes care of escaping its input, so we want to avoid passing its
  // output through the HTML sanitizer. Therefore we first extract the math
  // blocks from the input, render and sanitize the remaining markdown and then
  // render and re-insert the math blocks back into the output.
  const mathInfo = extractMath(markdown);

  // Extract details of embedded iframes and replace with placeholders, since
  // iframes will be removed when sanitizing the HTML.
  const embedInfo = extractEmbeds(mathInfo.content);

  let html = DOMPurify.sanitize(renderMarkdown(embedInfo.content));
  html = insertEmbedLinks(html, embedInfo.embedLinks);
  html = insertMath(html, mathInfo.mathBlocks);
  return html;
}

module.exports = render;
