import React from 'react';

function renderInlineMarkdown(text) {
  return text
    .split(/(\*\*.*?\*\*)/g)
    .filter(Boolean)
    .map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
      }

      return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
    });
}

const MarkdownPreview = ({ content }) => {
  const lines = content.split('\n');
  const blocks = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();

    if (!line) {
      continue;
    }

    if (line.startsWith('## ')) {
      blocks.push(
        <h3 key={`h2-${index}`}>{renderInlineMarkdown(line.slice(3))}</h3>,
      );
      continue;
    }

    if (line.startsWith('### ')) {
      blocks.push(
        <h4 key={`h3-${index}`}>{renderInlineMarkdown(line.slice(4))}</h4>,
      );
      continue;
    }

    if (/^- /.test(line)) {
      const items = [line.slice(2)];

      while (index + 1 < lines.length && /^- /.test(lines[index + 1].trim())) {
        index += 1;
        items.push(lines[index].trim().slice(2));
      }

      blocks.push(
        <ul key={`ul-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={`${item}-${itemIndex}`}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\. /.test(line)) {
      const items = [line.replace(/^\d+\. /, '')];

      while (index + 1 < lines.length && /^\d+\. /.test(lines[index + 1].trim())) {
        index += 1;
        items.push(lines[index].trim().replace(/^\d+\. /, ''));
      }

      blocks.push(
        <ol key={`ol-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={`${item}-${itemIndex}`}>{renderInlineMarkdown(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    blocks.push(
      <p key={`p-${index}`}>{renderInlineMarkdown(line)}</p>,
    );
  }

  return <div className="ai-report-markdown">{blocks}</div>;
};

export default MarkdownPreview;
