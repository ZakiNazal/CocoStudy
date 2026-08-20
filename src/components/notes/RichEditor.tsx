import { useEffect, useRef } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { TableKit } from '@tiptap/extension-table';
import { Placeholder } from '@tiptap/extensions';
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Table as TableIcon,
  Trash2,
  Undo2,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  ArrowDownToLine,
  CheckSquare,
  FileCode,
} from 'lucide-react';
import { htmlToMarkdown, markdownToHtml } from '../../lib/richtext';

/**
 * The study guide, edited as a document rather than as source.
 *
 * Markdown remains what is stored and what the model reads. This is a view
 * over it: the text comes in as HTML on open and goes back out as markdown on
 * every change, through the bridge in lib/richtext, which is tested to return
 * a guide unchanged.
 *
 * The editor owns its own undo history, so Ctrl+Z, Ctrl+B and the rest are the
 * ones the browser and every other editor already taught people.
 */

interface RichEditorProps {
  /** Markdown. */
  value: string;
  /** Called with markdown. */
  onChange: (markdown: string) => void;
}

const button =
  'flex h-9 min-w-9 items-center justify-center gap-1 rounded-[4px] px-2 text-[var(--ink-2)] transition-colors duration-150 hover:bg-[var(--paper-3)] hover:text-[var(--ink)] disabled:opacity-30 disabled:hover:bg-transparent';
const active = 'bg-[var(--paper-3)] text-[var(--accent)]';

function Tool({
  onClick,
  isActive,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      // The press must not take focus off the document, or the command would
      // have no selection to act on.
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={isActive}
      className={`${button} ${isActive ? active : ''}`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center gap-0.5 border-b border-[var(--rule)] bg-[var(--paper-2)] px-4 py-1.5 sm:mx-0 sm:rounded-t-[6px] sm:px-2">
      <Tool
        label="Undo (Ctrl+Z)"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      >
        <Undo2 size={15} />
      </Tool>
      <Tool
        label="Redo (Ctrl+Shift+Z)"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      >
        <Redo2 size={15} />
      </Tool>

      <span aria-hidden="true" className="mx-1 h-5 w-px bg-[var(--rule)]" />

      <Tool
        label="Heading 1 (Ctrl+Alt+1 or '# ')"
        isActive={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 size={15} />
      </Tool>
      <Tool
        label="Heading 2 (Ctrl+Alt+2 or '## ')"
        isActive={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 size={15} />
      </Tool>
      <Tool
        label="Sub-heading (Ctrl+Alt+3 or '### ')"
        isActive={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 size={15} />
      </Tool>

      <span aria-hidden="true" className="mx-1 h-5 w-px bg-[var(--rule)]" />

      <Tool
        label="Bold (Ctrl+B)"
        isActive={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold size={15} />
      </Tool>
      <Tool
        label="Italic (Ctrl+I)"
        isActive={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic size={15} />
      </Tool>
      <Tool
        label="Strikethrough"
        isActive={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough size={15} />
      </Tool>
      <Tool
        label="Inline code (Ctrl+E)"
        isActive={editor.isActive('code')}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code size={15} />
      </Tool>

      <span aria-hidden="true" className="mx-1 h-5 w-px bg-[var(--rule)]" />

      <Tool
        label="Bullet list (Ctrl+Shift+8 or '- ')"
        isActive={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List size={15} />
      </Tool>
      <Tool
        label="Numbered list (Ctrl+Shift+7 or '1. ')"
        isActive={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered size={15} />
      </Tool>
      <Tool
        label="Task list (Ctrl+Shift+9 or '[ ] ')"
        isActive={editor.isActive('taskList')}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      >
        <CheckSquare size={15} />
      </Tool>
      <Tool
        label="Quote (Type '> ')"
        isActive={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote size={15} />
      </Tool>
      <Tool
        label="Code block (Type '```')"
        isActive={editor.isActive('codeBlock')}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <FileCode size={15} />
      </Tool>

      <span aria-hidden="true" className="mx-1 h-5 w-px bg-[var(--rule)]" />

      <Tool
        label="Insert table"
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
      >
        <TableIcon size={15} />
      </Tool>
      <Tool label="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <Minus size={15} />
      </Tool>
    </div>
  );
}

/**
 * The controls for a table, shown only while the caret is inside one.
 *
 * They live in their own row rather than the main bar because they are
 * meaningless everywhere else, and a toolbar of permanently greyed-out buttons
 * teaches nobody anything.
 */
function TableTools({ editor }: { editor: Editor }) {
  if (!editor.isActive('table')) return null;

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-[var(--rule)] bg-[var(--accent-wash)] px-4 py-1.5 sm:px-2">
      <span className="label mr-1 pl-1 sm:pl-0">Table</span>

      <Tool
        label="Add column before"
        onClick={() => editor.chain().focus().addColumnBefore().run()}
        disabled={!editor.can().addColumnBefore()}
      >
        <ArrowLeftToLine size={14} />
      </Tool>
      <Tool
        label="Add column after"
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        disabled={!editor.can().addColumnAfter()}
      >
        <ArrowRightToLine size={14} />
      </Tool>
      <Tool
        label="Delete column"
        onClick={() => editor.chain().focus().deleteColumn().run()}
        disabled={!editor.can().deleteColumn()}
      >
        <span className="flex items-center gap-1 text-2xs">
          <Trash2 size={13} /> col
        </span>
      </Tool>

      <span aria-hidden="true" className="mx-1 h-5 w-px bg-[var(--rule)]" />

      <Tool
        label="Add row above"
        onClick={() => editor.chain().focus().addRowBefore().run()}
        disabled={!editor.can().addRowBefore()}
      >
        <ArrowUpToLine size={14} />
      </Tool>
      <Tool
        label="Add row below"
        onClick={() => editor.chain().focus().addRowAfter().run()}
        disabled={!editor.can().addRowAfter()}
      >
        <ArrowDownToLine size={14} />
      </Tool>
      <Tool
        label="Delete row"
        onClick={() => editor.chain().focus().deleteRow().run()}
        disabled={!editor.can().deleteRow()}
      >
        <span className="flex items-center gap-1 text-2xs">
          <Trash2 size={13} /> row
        </span>
      </Tool>

      <span aria-hidden="true" className="mx-1 h-5 w-px bg-[var(--rule)]" />

      <Tool label="Delete table" onClick={() => editor.chain().focus().deleteTable().run()}>
        <span className="flex items-center gap-1 text-2xs" style={{ color: 'var(--red)' }}>
          <Trash2 size={13} /> table
        </span>
      </Tool>
    </div>
  );
}

export default function RichEditor({ value, onChange }: RichEditorProps) {
  /*
   * Every keystroke serialises back to markdown and lifts it to the parent,
   * which hands the same string down again. Without this guard that return
   * trip would be treated as an outside edit and reset the document, taking
   * the caret with it.
   */
  const lastEmitted = useRef(value);

  const editor = useEditor({
    /*
     * v3 stopped re-rendering on every transaction for performance, which
     * leaves anything reading `editor.isActive(...)` frozen: the Bold button
     * never lights up and the table controls never appear, because the caret
     * moving is exactly the transaction nobody was told about.
     */
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        // Markdown has no underline, so offering it would produce formatting
        // that silently disappears on save.
        underline: false,
        link: { openOnClick: false },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TableKit.configure({ table: { resizable: false } }),
      Placeholder.configure({
        placeholder: 'Write your notes… (Type "- " for bullet list, "1. " for numbered list, "## " for heading)',
      }),
    ],
    content: markdownToHtml(value),
    editorProps: {
      attributes: {
        class: 'prose-notes focus:outline-none',
        'aria-label': 'Edit study guide content',
      },
    },
    onUpdate: ({ editor: instance }) => {
      const markdown = htmlToMarkdown(instance.getHTML());
      lastEmitted.current = markdown;
      onChange(markdown);
    },
  });

  // An edit from elsewhere — a restored backup, a different set — replaces the
  // document. One this editor just produced does not.
  useEffect(() => {
    if (!editor || value === lastEmitted.current) return;
    lastEmitted.current = value;
    editor.commands.setContent(markdownToHtml(value), { emitUpdate: false });
  }, [editor, value]);

  if (!editor) return null;

  return (
    <div className="rounded-[6px] border border-[var(--rule)] bg-[var(--paper-2)]">
      <Toolbar editor={editor} />
      <TableTools editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
