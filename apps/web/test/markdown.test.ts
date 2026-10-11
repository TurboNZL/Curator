import { describe, expect, it } from 'vitest';
import { docNameFromLink, renderMarkdown } from '../src/lib/markdown.ts';
import { guideName } from '../src/lib/guides.ts';

describe('guides markdown', () => {
  it('renders headings, paragraphs, lists, code and tables', () => {
    const html = renderMarkdown('# Title\n\nSome **bold** and `code <b>` and *it*.\n\n- one\n- two\n  - nested\n\n1. first\n2. second\n\n```\nsudo apt install x\n```\n\n| a | b |\n|---|---|\n| 1 | 2 |\n');
    expect(html).toContain('<h1 id="title">Title</h1>');
    expect(html).toContain('<strong>bold</strong>'); expect(html).toContain('<code>code &lt;b&gt;</code>'); expect(html).toContain('<em>it</em>');
    expect(html).toContain('<ul><li>one</li><li>two<ul><li>nested</li></ul></li></ul>');
    expect(html).toContain('<ol><li>first</li><li>second</li></ol>');
    expect(html).toContain('<pre><code>sudo apt install x</code></pre>');
    expect(html).toContain('<th>a</th>'); expect(html).toContain('<td>2</td>');
  });
  it('cannot inject markup or scripts', () => {
    const html = renderMarkdown('<script>alert(1)</script>\n\n[x](javascript:alert(1)) [ok](https://example.com/a?b=1&c=2) ![img](x.png)');
    expect(html).not.toContain('<script'); expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('javascript:'); expect(html).toContain('href="https://example.com/a?b=1&amp;c=2"'); expect(html).toContain('rel="noreferrer noopener"');
  });
  it('turns links to other guides into in-app links', () => {
    expect(docNameFromLink('DEPLOY_PI.md')).toBe('DEPLOY_PI'); expect(docNameFromLink('../appearance/THEMES.md#x')).toBe('appearance/THEMES'); expect(docNameFromLink('docs/UPDATING.md')).toBe('UPDATING');
    expect(docNameFromLink('https://x.com/a.md')).toBeNull(); expect(docNameFromLink('scripts/update.sh')).toBeNull();
    expect(renderMarkdown('see [Pi](DEPLOY_PI.md)')).toContain('data-doc="DEPLOY_PI"');
  });
  it('names guides by their place in docs/', () => {
    expect(guideName('../../../../docs/appearance/THEMES.md')).toBe('appearance/THEMES'); expect(guideName('../../../../docs/SPOTIFY.md')).toBe('SPOTIFY'); expect(guideName('../../../../README.md')).toBe('README');
  });
  it('keeps a code block inside a list item whole', () => {
    const html = renderMarkdown('1. Run:\n   ```\n   curl -fsSL x | sudo bash\n   ```\n   It takes a minute.\n2. Next');
    expect(html).toContain('<pre><code>curl -fsSL x | sudo bash</code></pre>'); expect(html).toContain('<li>Next</li>');
  });
  it('keeps pipes inside code from splitting table cells', () => {
    expect(renderMarkdown('| cmd | what |\n|---|---|\n| `a \\| b` | x |')).toContain('<td><code>a | b</code></td>');
  });
});
